import { Observable } from "rxjs"

import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { inArray } from "drizzle-orm"

import {
	BulkRefundPaymentPreview,
	BulkRefundPreview,
	BulkRefundProgressEvent,
	BulkRefundResponse,
	BulkRefundResult,
	Refund,
	RefundRequest,
} from "@repo/domain/types"

import { DrizzleService, refund, registrationFee, toDbString } from "../../database"
import { StripeService } from "../../stripe/stripe.service"
import { PaymentsRepository } from "../repositories/payments.repository"
import { toRefund } from "../mappers"
import { BulkRefundProgressTracker } from "./bulk-refund-progress-tracker"

@Injectable()
export class RefundService {
	private readonly logger = new Logger(RefundService.name)

	constructor(
		@Inject(DrizzleService) private readonly drizzle: DrizzleService,
		@Inject(PaymentsRepository) private readonly paymentsRepository: PaymentsRepository,
		@Inject(StripeService) private readonly stripeService: StripeService,
		@Inject(BulkRefundProgressTracker) private readonly progressTracker: BulkRefundProgressTracker,
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

	/** Get bulk refund preview for an event. */
	async getBulkRefundPreview(eventId: number): Promise<BulkRefundPreview> {
		const confirmedPayments =
			await this.paymentsRepository.findConfirmedPaymentsByEventWithDetails(eventId)

		const payments: BulkRefundPaymentPreview[] = []
		let skippedCount = 0

		for (const p of confirmedPayments) {
			const paidFees = p.fees.filter((f) => f.isPaid === 1)
			if (paidFees.length === 0) {
				skippedCount++
				continue
			}

			const refundAmount = paidFees.reduce((sum, f) => sum + parseFloat(f.amount), 0)
			payments.push({
				paymentId: p.paymentId,
				playerName: p.playerName,
				feeCount: paidFees.length,
				refundAmount,
				registrationFeeIds: paidFees.map((f) => f.registrationFeeId),
			})
		}

		const totalRefundAmount = payments.reduce((sum, p) => sum + p.refundAmount, 0)

		return {
			eventId,
			payments,
			totalRefundAmount,
			skippedCount,
		}
	}

	/** Process bulk refunds for an event with streaming progress. */
	processBulkRefundsStream(eventId: number, issuerId: number): Observable<BulkRefundProgressEvent> {
		// Return existing observable if operation is already running
		const existing = this.progressTracker.getProgressObservable(eventId)
		if (existing) {
			return existing
		}

		const subject = this.progressTracker.startTracking(eventId)

		// Spawn async background operation
		void (async () => {
			try {
				const preview = await this.getBulkRefundPreview(eventId)
				const total = preview.payments.length
				const results: BulkRefundResult[] = []
				let refundedCount = 0
				let failedCount = 0
				let totalRefundAmount = 0

				for (let i = 0; i < preview.payments.length; i++) {
					const payment = preview.payments[i]
					this.progressTracker.emitProgress(eventId, i + 1, total, payment.playerName)

					try {
						await this.processRefunds(
							[{ paymentId: payment.paymentId, registrationFeeIds: payment.registrationFeeIds }],
							issuerId,
						)
						results.push({ paymentId: payment.paymentId, success: true })
						refundedCount++
						totalRefundAmount += payment.refundAmount
					} catch (err) {
						const errorMessage = err instanceof Error ? err.message : "Unknown error"
						this.logger.error(
							`Bulk refund failed for payment ${payment.paymentId}: ${errorMessage}`,
						)
						results.push({ paymentId: payment.paymentId, success: false, error: errorMessage })
						failedCount++
					}
				}

				const response: BulkRefundResponse = {
					refundedCount,
					failedCount,
					skippedCount: preview.skippedCount,
					totalRefundAmount,
					results,
				}
				this.progressTracker.completeOperation(eventId, response)
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Unknown error"
				this.logger.error(`Bulk refund operation failed for event ${eventId}: ${errorMessage}`)
				this.progressTracker.errorOperation(eventId, errorMessage)
			}
		})()

		return subject.asObservable()
	}
}
