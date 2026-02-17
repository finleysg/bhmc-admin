"use client"

import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useExportScores, type ScoreType } from "@/lib/hooks/use-my-scores"

interface ExportButtonProps {
	season: number
	courseIds?: number[]
	scoreType?: ScoreType
	disabled?: boolean
}

export function ExportButton({ season, courseIds, scoreType, disabled }: ExportButtonProps) {
	const { mutate: exportScores, isPending } = useExportScores()

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={disabled || isPending}
			onClick={() => exportScores({ season, courseIds, scoreType })}
		>
			{isPending ? (
				<Loader2 className="mr-1 size-4 animate-spin" />
			) : (
				<Download className="mr-1 size-4" />
			)}
			Export
		</Button>
	)
}
