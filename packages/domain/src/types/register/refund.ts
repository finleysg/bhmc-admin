export interface Refund {
	id: number
	refundCode: string
	refundAmount: number
	notes?: string | null
	confirmed: boolean
	refundDate?: string | null
	issuerId: number
	paymentId: number
}

export interface RefundRequest {
	paymentId: number
	registrationFeeIds: number[]
}
