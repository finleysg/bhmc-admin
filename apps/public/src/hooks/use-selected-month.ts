import { useState } from "react"

import { format } from "date-fns"

export function useSelectedMonth() {
	const [selectedMonth, setSelectedMonth] = useState(() => {
		const now = new Date()
		return {
			year: now.getFullYear(),
			monthName: format(now, "LLLL"),
		}
	})

	return {
		year: selectedMonth.year,
		monthName: selectedMonth.monthName,
		setSelectedMonth,
	}
}
