"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateAverageScores, calculateBestScores, type Round } from "@/lib/scores"
import type { Hole, ScoreCourse } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ScoreGrid } from "./score-grid"

interface CourseScorecardProps {
	course: ScoreCourse
	holes: Hole[]
	grossRounds: Round[]
	netRounds: Round[]
	scoreType: "gross" | "net" | "both"
}

export function CourseScorecard({
	course,
	holes,
	grossRounds,
	netRounds,
	scoreType,
}: CourseScorecardProps) {
	const showGross = scoreType === "gross" || scoreType === "both"
	const rounds = showGross ? grossRounds : netRounds

	const isBoth = scoreType === "both"
	const averageScores = !isBoth ? calculateAverageScores(rounds, holes) : undefined
	const bestScores = !isBoth ? calculateBestScores(rounds, holes) : undefined
	const grossAverageScores = isBoth ? calculateAverageScores(grossRounds, holes) : undefined
	const grossBestScores = isBoth ? calculateBestScores(grossRounds, holes) : undefined
	const netAverageScores = isBoth ? calculateAverageScores(netRounds, holes) : undefined
	const netBestScores = isBoth ? calculateBestScores(netRounds, holes) : undefined

	return (
		<Card className="pt-0 overflow-hidden">
			<CardHeader
				className={cn("py-3", !course.color && "bg-primary/10")}
				style={course.color ? { backgroundColor: `${course.color}20` } : undefined}
			>
				<CardTitle className="text-base" style={course.color ? { color: course.color } : undefined}>
					{course.name}
				</CardTitle>
			</CardHeader>
			<CardContent className="p-3">
				<ScoreGrid
					holes={holes}
					grossRounds={grossRounds}
					netRounds={netRounds}
					scoreType={scoreType}
					averageScores={averageScores}
					bestScores={bestScores}
					grossAverageScores={grossAverageScores}
					grossBestScores={grossBestScores}
					netAverageScores={netAverageScores}
					netBestScores={netBestScores}
				/>
			</CardContent>
		</Card>
	)
}
