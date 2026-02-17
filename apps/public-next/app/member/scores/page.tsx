"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerScores, type ScoreType } from "@/lib/hooks/use-my-scores"
import { useClubEvents } from "@/lib/hooks/use-club-events"
import { loadRounds } from "@/lib/scores"
import type { Hole, ScoreCourse } from "@/lib/types"
import { ScoreFilters } from "./components/score-filters"
import { CourseScorecard } from "./components/course-scorecard"

export default function ScoresPage() {
	const currentYear = new Date().getFullYear()
	const { data: player } = useMyPlayer()
	const [season, setSeason] = useState(currentYear)
	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [scoreType, setScoreType] = useState<ScoreType>("gross")

	const { data: events } = useClubEvents(season)
	const { data: playerRounds, isLoading } = usePlayerScores(season, player?.id)

	const grossRounds = useMemo(
		() => loadRounds(events ?? [], playerRounds ?? [], false),
		[events, playerRounds],
	)

	const netRounds = useMemo(
		() => loadRounds(events ?? [], playerRounds ?? [], true),
		[events, playerRounds],
	)

	const courses = useMemo(() => {
		const courseMap = new Map<number, ScoreCourse>()
		for (const round of grossRounds) {
			if (!courseMap.has(round.course.id)) {
				courseMap.set(round.course.id, round.course)
			}
		}
		return Array.from(courseMap.values()).filter((c) => c.number_of_holes === 9)
	}, [grossRounds])

	const getHolesForCourse = (courseId: number): Hole[] => {
		const round = grossRounds.find((r) => r.course.id === courseId)
		return round?.holes ?? []
	}

	const displayedCourses =
		selectedCourseId === null ? courses : courses.filter((c) => c.id === selectedCourseId)

	const busy = isLoading || !events

	return (
		<div>
			<Link
				href="/member"
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back
			</Link>
			<h1 className="mb-6 text-2xl font-semibold text-primary">My Scores</h1>

			<ScoreFilters
				courses={courses}
				selectedCourseId={selectedCourseId}
				onCourseChange={setSelectedCourseId}
				scoreType={scoreType}
				onScoreTypeChange={setScoreType}
				season={season}
				onSeasonChange={setSeason}
				exportDisabled={busy || grossRounds.length === 0}
			/>

			{busy ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-48 w-full" />
					))}
				</div>
			) : (
				<div className="grid gap-4 lg:grid-cols-3 md:grid-cols-1">
					{displayedCourses.map((course) => {
						const courseGrossRounds = grossRounds.filter((r) => r.course.id === course.id)
						const courseNetRounds = netRounds.filter((r) => r.course.id === course.id)
						const holes = getHolesForCourse(course.id)
						return (
							<CourseScorecard
								key={course.id}
								course={course}
								holes={holes}
								grossRounds={courseGrossRounds}
								netRounds={courseNetRounds}
								scoreType={scoreType}
							/>
						)
					})}
					{displayedCourses.length === 0 && (
						<p className="text-sm text-muted-foreground">No scores found for this season.</p>
					)}
				</div>
			)}
		</div>
	)
}
