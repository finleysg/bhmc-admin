export interface PaymentReportDetail {
	player: string
	eventFee: string
	amount: number
	isPaid: boolean
}

export interface PaymentReportRefund {
	refundCode: string
	refundAmount: number
	refundDate: string
	issuedBy: string
}

export interface PaymentReportRow {
	userName: string
	paymentId: number
	paymentCode: string
	paymentDate: string
	confirmDate: string
	amountPaid: number
	transactionFee: number
	amountRefunded: number
	details: PaymentReportDetail[]
	refunds: PaymentReportRefund[]
}
