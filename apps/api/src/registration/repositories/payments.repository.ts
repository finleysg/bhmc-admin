import { eq, inArray } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import {
	DrizzleService,
	payment,
	PaymentRowWithDetails,
	refund,
	registrationFee,
	registrationSlot,
	type PaymentInsert,
	type PaymentRow,
	type RefundInsert,
	type RefundRow,
	type RegistrationFeeInsert,
	type RegistrationFeeRow,
} from "../../database"

@Injectable()
export class PaymentsRepository {
	constructor(private drizzle: DrizzleService) {}

	// ==================== PAYMENT ====================

	async findPaymentById(paymentId: number): Promise<PaymentRow | null> {
		const [p] = await this.drizzle.db
			.select()
			.from(payment)
			.where(eq(payment.id, paymentId))
			.limit(1)

		return p ?? null
	}

	async findByPaymentCode(paymentCode: string): Promise<PaymentRow | null> {
		const [p] = await this.drizzle.db
			.select()
			.from(payment)
			.where(eq(payment.paymentCode, paymentCode))
			.limit(1)
		return p ?? null
	}

	async findPaymentsForRegistration(registrationId: number): Promise<PaymentRow[]> {
		return this.drizzle.db
			.selectDistinct({ payment })
			.from(payment)
			.innerJoin(registrationFee, eq(payment.id, registrationFee.paymentId))
			.innerJoin(registrationSlot, eq(registrationFee.registrationSlotId, registrationSlot.id))
			.where(eq(registrationSlot.registrationId, registrationId))
			.then((rows) => rows.map((r) => r.payment))
	}

	async findPaymentWithDetailsById(paymentId: number): Promise<PaymentRowWithDetails | null> {
		const results = await this.drizzle.db
			.select({
				payment,
				details: registrationFee,
			})
			.from(payment)
			.leftJoin(registrationFee, eq(payment.id, registrationFee.paymentId))
			.where(eq(payment.id, paymentId))

		if (!results[0]?.payment) return null

		return {
			...results[0].payment,
			paymentDetails: results.filter((r) => r.details !== null).map((r) => r.details!) ?? [],
		}
	}

	async createPayment(data: PaymentInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(payment).values(data)
		return Number(result.insertId)
	}

	async updatePayment(paymentId: number, data: Partial<PaymentInsert>): Promise<void> {
		await this.drizzle.db.update(payment).set(data).where(eq(payment.id, paymentId))
	}

	async updatePaymentIntent(
		paymentId: number,
		paymentCode: string,
		paymentKey: string,
	): Promise<void> {
		await this.drizzle.db
			.update(payment)
			.set({ paymentCode, paymentKey })
			.where(eq(payment.id, paymentId))
	}

	// TODO: turn this into a soft delete
	async deletePayment(paymentId: number): Promise<void> {
		await this.drizzle.db.delete(payment).where(eq(payment.id, paymentId))
	}

	// ==================== PAYMENT DETAIL ====================

	async findPaymentDetailsByPayment(paymentId: number): Promise<RegistrationFeeRow[]> {
		return this.drizzle.db
			.select()
			.from(registrationFee)
			.where(eq(registrationFee.paymentId, paymentId))
	}

	async createPaymentDetail(data: RegistrationFeeInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(registrationFee).values(data)
		return Number(result.insertId)
	}

	async updatePaymentDetailStatus(feeIds: number[], isPaid: boolean): Promise<void> {
		if (feeIds.length === 0) return
		await this.drizzle.db
			.update(registrationFee)
			.set({ isPaid: isPaid ? 1 : 0 })
			.where(inArray(registrationFee.id, feeIds))
	}

	async deletePaymentDetailsByPayment(paymentId: number): Promise<void> {
		await this.drizzle.db.delete(registrationFee).where(eq(registrationFee.paymentId, paymentId))
	}

	// ==================== REFUND ====================

	async findRefundByRefundCode(refundCode: string): Promise<RefundRow | null> {
		const [r] = await this.drizzle.db
			.select()
			.from(refund)
			.where(eq(refund.refundCode, refundCode))
			.limit(1)
		return r ?? null
	}

	async createRefund(data: RefundInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(refund).values(data)
		return Number(result.insertId)
	}

	async updateRefundCode(refundId: number, refundCode: string): Promise<void> {
		await this.drizzle.db.update(refund).set({ refundCode }).where(eq(refund.id, refundId))
	}

	async confirmRefund(refundId: number): Promise<void> {
		await this.drizzle.db.update(refund).set({ confirmed: 1 }).where(eq(refund.id, refundId))
	}
}
