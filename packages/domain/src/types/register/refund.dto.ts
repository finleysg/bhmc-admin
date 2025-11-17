export interface RefundDto {
	id: number
	refundCode: string
	refundAmount: number
	notes?: string | null
	confirmed: boolean
	refundDate?: string | null
	issuerId: number
	paymentId: number
}
