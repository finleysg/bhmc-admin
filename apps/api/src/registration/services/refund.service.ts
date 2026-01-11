import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { inArray } from "drizzle-orm"

import { Refund, RefundRequest } from "@repo/domain/types"

import { DrizzleService, refund, registrationFee, toDbString } from "../../database"
import { StripeService } from "../../stripe/stripe.service"
import { PaymentsRepository } from "../repositories/payments.repository"
import { toRefund } from "../mappers"

@Injectable()
export class RefundService {
	private readonly logger = new Logger(RefundService.name)

	constructor(
		private readonly drizzle: DrizzleService,
		private readonly paymentsRepository: PaymentsRepository,
		private readonly stripeService: StripeService,
	) {}

	/** Process Stripe refunds for payments. */
	async processRefunds(requests: RefundRequest[], issuerId: number): Promise<void> {
		if (!requests.length) {
			throw new BadRequestException("At least one refund request is required")
		}

		for (const request of requests) {
			const paymentRecord = await this.paymentsRepository.findPaymentWithDetailsById(
				request.paymentId,
			)
			if (!paymentRecord || !paymentRecord.paymentCode || !paymentRecord.paymentDetails.length) {
				throw new NotFoundException(`Payment ${request.paymentId} is not valid for refund`)
			}

			const refundAmount = paymentRecord.paymentDetails.reduce((total: number, fee) => {
				const amount = fee.isPaid ? Math.round(parseFloat(fee.amount) * 100) : 0
				return total + amount
			}, 0)

			if (refundAmount <= 0) {
				throw new BadRequestException("Refund amount must be greater than zero")
			}

			const refundInDollars = refundAmount / 100

			let refundId: number
			try {
				refundId = await this.drizzle.db.transaction(async (tx) => {
					const refundRecord = {
						refundCode: `pending-${Math.random().toString(36).substring(2, 8)}`,
						refundAmount: refundInDollars.toFixed(2),
						confirmed: 0,
						refundDate: toDbString(new Date()),
						issuerId,
						paymentId: request.paymentId,
					}
					const [result] = await tx.insert(refund).values(refundRecord)
					const newRefundId = Number(result.insertId)

					if (request.registrationFeeIds.length > 0) {
						await tx
							.update(registrationFee)
							.set({ isPaid: 0 })
							.where(inArray(registrationFee.id, request.registrationFeeIds))
					}

					return newRefundId
				})
			} catch (dbError) {
				this.logger.error(
					`Failed to create pending refund record for payment ${request.paymentId}`,
					dbError,
				)
				throw dbError
			}

			try {
				const stripeRefundId = await this.stripeService.createRefund(
					paymentRecord.paymentCode,
					refundInDollars,
				)

				await this.paymentsRepository.updateRefundCode(refundId, stripeRefundId)
			} catch (stripeError) {
				this.logger.error(
					`Stripe refund failed for payment ${request.paymentId}. ` +
						`Refund record ${refundId} remains in pending state for manual review.`,
					stripeError,
				)
				throw stripeError
			}
		}
	}

	/** Create refund record. */
	async createRefund(data: {
		refundCode: string
		refundAmount: number
		notes: string
		issuerId: number
		paymentId: number
	}): Promise<number> {
		return this.paymentsRepository.createRefund({
			refundCode: data.refundCode,
			refundAmount: data.refundAmount.toFixed(2),
			notes: data.notes,
			confirmed: 0,
			refundDate: toDbString(new Date()),
			issuerId: data.issuerId,
			paymentId: data.paymentId,
		})
	}

	/** Find refund by Stripe refund code. */
	async findRefundByRefundCode(refundCode: string): Promise<Refund | null> {
		const row = await this.paymentsRepository.findRefundByRefundCode(refundCode)
		return row ? toRefund(row) : null
	}

	/** Confirm refund after Stripe webhook. */
	async confirmRefund(refundCode: string): Promise<void> {
		const row = await this.paymentsRepository.findRefundByRefundCode(refundCode)
		if (!row) {
			this.logger.warn(`Refund ${refundCode} not found for confirmation`)
			return
		}
		if (row.confirmed) {
			this.logger.log(`Refund ${refundCode} already confirmed`)
			return
		}
		await this.paymentsRepository.confirmRefund(row.id)
	}
}
