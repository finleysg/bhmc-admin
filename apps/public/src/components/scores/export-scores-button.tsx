import { ScoreType, useExportScores } from "../../hooks/use-export-scores"

interface ExportScoresButtonProps {
	season: number
	courseIds?: number[]
	scoreType?: ScoreType
	disabled?: boolean
}

export function ExportScoresButton({
	season,
	courseIds,
	scoreType = "both",
	disabled = false,
}: ExportScoresButtonProps) {
	const { mutate, isPending } = useExportScores()

	const handleExport = () => {
		mutate({ season, courseIds, scoreType })
	}

	return (
		<button
			className="btn btn-sm btn-primary"
			onClick={handleExport}
			disabled={disabled || isPending}
		>
			Export
		</button>
	)
}
