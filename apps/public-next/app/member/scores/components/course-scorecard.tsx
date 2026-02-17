"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateAverageScores, calculateBestScores, type Round } from "@/lib/scores"
import type { Hole, ScoreCourse } from "@/lib/types"
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

	const averageScores = calculateAverageScores(rounds, holes)
	const bestScores = calculateBestScores(rounds, holes)

	return (
		<Card>
			<CardHeader className="bg-primary/10 py-3">
				<CardTitle className="text-base text-primary">{course.name}</CardTitle>
			</CardHeader>
			<CardContent className="p-3">
				<ScoreGrid
					holes={holes}
					grossRounds={grossRounds}
					netRounds={netRounds}
					scoreType={scoreType}
					averageScores={averageScores}
					bestScores={bestScores}
				/>
			</CardContent>
		</Card>
	)
}
