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

export interface BulkRefundPaymentPreview {
	paymentId: number
	playerName: string
	feeCount: number
	refundAmount: number
	registrationFeeIds: number[]
}

export interface BulkRefundPreview {
	eventId: number
	payments: BulkRefundPaymentPreview[]
	totalRefundAmount: number
	skippedCount: number
}

export interface BulkRefundResult {
	paymentId: number
	success: boolean
	error?: string
}

export interface BulkRefundResponse {
	refundedCount: number
	failedCount: number
	skippedCount: number
	totalRefundAmount: number
	results: BulkRefundResult[]
}

export interface BulkRefundProgressEvent {
	status: "processing" | "complete" | "error"
	current: number
	total: number
	playerName?: string
	error?: string
	result?: BulkRefundResponse
}
