"use client"

import type { ScoreType } from "@/lib/hooks/use-my-scores"
import type { ScoreCourse } from "@/lib/types"
import { ExportButton } from "./export-button"
import { SeasonSelect } from "./season-select"

interface ScoreFiltersProps {
	courses: ScoreCourse[]
	selectedCourseId: number | null
	onCourseChange: (courseId: number | null) => void
	scoreType: ScoreType
	onScoreTypeChange: (type: ScoreType) => void
	season: number
	onSeasonChange: (season: number) => void
	exportDisabled: boolean
}

export function ScoreFilters({
	courses,
	selectedCourseId,
	onCourseChange,
	scoreType,
	onScoreTypeChange,
	season,
	onSeasonChange,
	exportDisabled,
}: ScoreFiltersProps) {
	const exportCourseIds = selectedCourseId !== null ? [selectedCourseId] : undefined

	return (
		<div className="mb-4 flex flex-wrap items-center gap-2">
			<select
				className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
				value={selectedCourseId ?? ""}
				onChange={(e) => onCourseChange(e.target.value ? Number(e.target.value) : null)}
			>
				<option value="">All Courses</option>
				{courses.map((c) => (
					<option key={c.id} value={c.id}>
						{c.name}
					</option>
				))}
			</select>

			<select
				className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
				value={scoreType}
				onChange={(e) => onScoreTypeChange(e.target.value as ScoreType)}
			>
				<option value="gross">Gross</option>
				<option value="net">Net</option>
				<option value="both">Both</option>
			</select>

			<SeasonSelect season={season} onSelect={onSeasonChange} />

			<ExportButton
				season={season}
				courseIds={exportCourseIds}
				scoreType={scoreType}
				disabled={exportDisabled}
			/>
		</div>
	)
}
