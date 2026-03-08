"use client"

import { useMemo } from "react"

const FIRST_SEASON = 2021

interface SeasonSelectProps {
	season: number
	onSelect: (season: number) => void
}

export function SeasonSelect({ season, onSelect }: SeasonSelectProps) {
	const currentYear = new Date().getFullYear()

	const options = useMemo(() => {
		const years: number[] = []
		for (let y = currentYear; y >= FIRST_SEASON; y--) {
			years.push(y)
		}
		return years
	}, [currentYear])

	return (
		<select
			className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
			value={season}
			onChange={(e) => onSelect(Number(e.target.value))}
		>
			{options.map((year) => (
				<option key={year} value={year}>
					{year}
				</option>
			))}
			<option value={0}>All</option>
		</select>
	)
}
