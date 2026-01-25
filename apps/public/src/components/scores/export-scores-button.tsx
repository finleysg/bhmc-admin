import { FiDownload } from "react-icons/fi"
import { IconActionButton } from "../buttons/icon-action-button"
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
		<IconActionButton
			label="Export to Excel"
			onClick={handleExport}
			disabled={disabled || isPending}
		>
			<FiDownload size={20} />
		</IconActionButton>
	)
}
