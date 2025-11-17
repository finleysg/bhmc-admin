export interface PaymentDto {
	id: number
	paymentCode: string
	paymentKey?: string | null
	notificationType?: string | null
	confirmed: boolean
	eventId: number
	userId: number
	paymentAmount: number
	transactionFee: number
	paymentDate: string
	confirmDate?: string | null
}
