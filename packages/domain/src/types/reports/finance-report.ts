export interface FeeTypeSum {
	feeTypeName: string
	amount: number
}

export interface FinanceReportSummary {
	eventId: number
	feeTypeSums: FeeTypeSum[]
	totalCollectedOnline: number
	collectedCash: number
	totalCollected: number
	proShopPayouts: number
	cashPayouts: number
	totalPayouts: number
	greenFees: number
	cartFees: number
	totalPassThrough: number
	balance: number
}
