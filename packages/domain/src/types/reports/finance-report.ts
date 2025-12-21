export interface FinanceReportSummary {
	eventId: number
	// Inflows (Gross Collected)
	creditCollected: number
	cashCollected: number
	passthruCollected: number
	totalCollected: number // Sum of above
	// Refunds (per bucket)
	creditRefunds: number
	cashRefunds: number
	passthruRefunds: number
	totalRefunds: number // Sum of all refunds
	// Net Inflows
	creditNet: number // creditCollected - creditRefunds
	cashNet: number // cashCollected - cashRefunds
	passthruNet: number // passthruCollected - passthruRefunds
	// Outflows
	creditPayouts: Record<string, number> // e.g., { 'stroke': 150, 'skins': 50 }
	creditTotalPayouts: number
	cashPayouts: Record<string, number>
	cashTotalPayouts: number
}
