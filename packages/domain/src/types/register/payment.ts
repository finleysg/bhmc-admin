import type { NotificationTypeValue } from "./choices"

export interface Payment {
	id: number
	paymentCode: string
	paymentKey?: string | null
	notificationType?: NotificationTypeValue | null
	confirmed: boolean
	eventId: number
	userId: number
	paymentAmount: number
	transactionFee: number
	paymentDate: string
	confirmDate?: string | null
}

export interface AmountDue {
	subtotal: number
	transactionFee: number
	total: number
}
