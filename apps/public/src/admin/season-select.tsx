import { ChangeEvent, useState } from "react"

import { SelectOption } from "../components/forms/select-control"
import { currentSeason } from "../utils/app-config"

interface SeasonSelectProps {
	season: number
	startAt?: number
	onSelect: (season: number) => void
}

export function SeasonSelect({ season, startAt, onSelect }: SeasonSelectProps) {
	const [selectedSeason, setSelectedSeason] = useState(season)
	const startingYear = startAt ?? 2013

	const seasons = () => {
		const size = currentSeason - startingYear + 1 + 1
		const seasons = [...Array(size).keys()]
			.map((i) => i + startingYear)
			.map((year) => {
				return { value: year, name: year.toString() } as SelectOption
			})
		return seasons
	}

	const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
		setSelectedSeason(+e.target.value)
		onSelect(+e.target.value)
	}

	return (
		<div className="form-group mb-2">
			<label htmlFor="season-select">Season</label>
			<select
				id="season-select"
				value={selectedSeason}
				onChange={handleSelect}
				className="form-control w-auto"
			>
				{seasons().map((opt) => {
					return (
						<option key={opt.value} value={opt.value}>
							{opt.name}
						</option>
					)
				})}
			</select>
		</div>
	)
}
