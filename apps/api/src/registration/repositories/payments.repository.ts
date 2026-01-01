import { eq, inArray } from "drizzle-orm"

import { Injectable } from "@nestjs/common"

import {
	DrizzleService,
	payment,
	refund,
	registrationFee,
	type PaymentInsert,
	type PaymentRow,
	type RefundInsert,
	type RegistrationFeeInsert,
	type RegistrationFeeRow,
} from "../../database"

@Injectable()
export class PaymentsRepository {
	constructor(private drizzle: DrizzleService) {}

	async findPaymentWithDetailsById(
		paymentId: number,
	): Promise<{ payment: PaymentRow; details: RegistrationFeeRow[] } | null> {
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
			payment: results[0].payment,
			details: results
				.filter(
					(r): r is { payment: PaymentRow; details: RegistrationFeeRow } => r.details !== null,
				)
				.map((r) => r.details),
		}
	}

	async findRegistrationFeesByPayment(paymentId: number): Promise<RegistrationFeeRow[]> {
		return this.drizzle.db
			.select()
			.from(registrationFee)
			.where(eq(registrationFee.paymentId, paymentId))
	}

	async createRefund(data: RefundInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(refund).values(data)
		return Number(result.insertId)
	}

	async updateRefundCode(refundId: number, refundCode: string): Promise<void> {
		await this.drizzle.db.update(refund).set({ refundCode }).where(eq(refund.id, refundId))
	}

	async updateRegistrationFeeStatus(feeIds: number[], isPaid: boolean): Promise<void> {
		if (feeIds.length === 0) return
		await this.drizzle.db
			.update(registrationFee)
			.set({ isPaid: isPaid ? 1 : 0 })
			.where(inArray(registrationFee.id, feeIds))
	}

	async findPaymentById(paymentId: number): Promise<PaymentRow | null> {
		const [p] = await this.drizzle.db
			.select()
			.from(payment)
			.where(eq(payment.id, paymentId))
			.limit(1)

		return p ?? null
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

	async createRegistrationFee(data: RegistrationFeeInsert): Promise<number> {
		const [result] = await this.drizzle.db.insert(registrationFee).values(data)
		return Number(result.insertId)
	}

	async deleteRegistrationFeesByPayment(paymentId: number): Promise<void> {
		await this.drizzle.db.delete(registrationFee).where(eq(registrationFee.paymentId, paymentId))
	}
}
