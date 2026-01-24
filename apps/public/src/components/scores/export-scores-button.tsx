import * as XLSX from "xlsx"
import { FiDownload } from "react-icons/fi"
import { IconActionButton } from "../buttons/icon-action-button"
import { Round } from "../../models/scores"

interface ExportScoresButtonProps {
	rounds: Round[]
	season: number
	disabled?: boolean
}

export function ExportScoresButton({ rounds, season, disabled = false }: ExportScoresButtonProps) {
	const handleExport = () => {
		// Sort rounds by course name then date
		const sortedRounds = [...rounds].sort((a, b) => {
			const courseCompare = a.course.name.localeCompare(b.course.name)
			if (courseCompare !== 0) return courseCompare
			return a.eventDate.localeCompare(b.eventDate)
		})

		// Build worksheet data
		const data: (string | number)[][] = []

		// Header row
		const headers = [
			"Date",
			"Tee",
			"Type",
			"Course",
			...Array.from({ length: 9 }, (_, i) => `${i + 1}`),
			"Total",
		]
		data.push(headers)

		// Data rows
		for (const round of sortedRounds) {
			const holeScores = round.scores.map((s) => +s.score)
			const total = holeScores.reduce((sum, score) => sum + score, 0)

			const row = [
				round.eventDate,
				round.tee.name,
				round.eventName,
				round.course.name,
				...holeScores,
				total,
			]
			data.push(row)
		}

		// Create workbook and worksheet
		const ws = XLSX.utils.aoa_to_sheet(data)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, "Scores")

		// Generate and download file
		XLSX.writeFile(wb, `my-scores-${season}.xlsx`)
	}

	return (
		<IconActionButton label="Export to Excel" onClick={handleExport} disabled={disabled}>
			<FiDownload size={20} />
		</IconActionButton>
	)
}
