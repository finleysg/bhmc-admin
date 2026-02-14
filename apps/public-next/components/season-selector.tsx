"use client"

import { useRouter } from "next/navigation"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { currentSeason } from "@/lib/constants"

interface SeasonSelectorProps {
	basePath: string
	season: number
	startYear: number
}

export function SeasonSelector({ basePath, season, startYear }: SeasonSelectorProps) {
	const router = useRouter()

	const years: number[] = []
	for (let y = currentSeason; y >= startYear; y--) {
		years.push(y)
	}

	return (
		<Select value={String(season)} onValueChange={(value) => router.push(`${basePath}/${value}`)}>
			<SelectTrigger className="w-32">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{years.map((y) => (
					<SelectItem key={y} value={String(y)}>
						{y}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
