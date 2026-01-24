import { useState, useEffect } from "react"
import { useClubEvents } from "../../hooks/use-club-events"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { usePlayerScores } from "../../hooks/use-player-scores"
import { RoundsProps, SeasonProps } from "../../models/common-props"
import { Hole } from "../../models/course"
import { CourseInRound, LoadRounds, Round, ScoreByHole } from "../../models/scores"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { CourseFilterChips } from "./course-filter-chips"
import {
	AverageScore,
	HoleNumbers,
	HolePars,
	HoleScore,
	HolesProps,
	RoundScores,
	RoundScoresProps,
	RoundTotal,
	ScoresByHoleProps,
} from "./score-utils"

function AverageRound({ scores }: ScoresByHoleProps) {
	return (
		<div style={{ display: "flex" }}>
			<div className="round" style={{ flex: 1 }}>
				Average
			</div>
			<div className="scores">
				{scores.map((score) => {
					return <AverageScore key={score.hole.id} score={score} />
				})}
				<RoundTotal scores={scores} places={1} />
			</div>
		</div>
	)
}

function BestBallRound({ scores }: ScoresByHoleProps) {
	return (
		<div style={{ display: "flex" }}>
			<div className="round" style={{ flex: 1 }}>
				Best Ball
			</div>
			<div className="scores">
				{scores.map((score) => {
					return <HoleScore key={score.hole.id} score={score} />
				})}
				<RoundTotal scores={scores} places={0} />
			</div>
		</div>
	)
}

interface RoundsByCourseProps extends HolesProps, RoundsProps {
	course: CourseInRound
}

function RoundsByCourse({ course, holes, courseName, rounds }: RoundsByCourseProps) {
	const averageScores = () => {
		return holes.map((hole) => {
			const scores: ScoreByHole[] = []
			rounds.forEach((round) => {
				scores.push(round.scores.find((score) => score.hole.id === hole.id)!)
			})
			const total = scores.reduce((total, score) => total + +score.score, 0)
			return new ScoreByHole({
				hole,
				score: total / scores.length,
				places: 1,
			})
		})
	}

	const bestScores = () => {
		return holes.map((hole) => {
			const scores: ScoreByHole[] = []
			rounds.forEach((round) => {
				scores.push(round.scores.find((score) => score.hole.id === hole.id)!)
			})
			const allScores = scores.map((s) => +s.score)
			const lowScore = Math.min(...allScores)
			return new ScoreByHole({
				hole,
				score: lowScore,
			})
		})
	}

	const headerClass = (course: CourseInRound) => {
		return `scores-header bg-${course.name.toLowerCase()}`
	}

	return (
		<div className="card mb-2">
			<div className={headerClass(course)}>
				<span>{course.name}</span>
			</div>
			{rounds.length > 0 ? (
				<div className="card-body">
					<HoleNumbers holes={holes} courseName={courseName} />
					<HolePars holes={holes} courseName={courseName} />
					{rounds.map((round) => {
						return <RoundScores key={round.eventDate} round={round} scoreType={isNet ? "Net" : "Gross"} />
					})}
					<hr />
					<AverageRound scores={averageScores()} />
					<BestBallRound scores={bestScores()} />
				</div>
			) : (
				<div className="card-body">No rounds played</div>
			)}
		</div>
	)
}

interface PlayerScoresProps extends SeasonProps {
	isNet: boolean
	onFilteredRoundsChange?: (rounds: Round[]) => void
}

export function PlayerScores({ isNet, season, onFilteredRoundsChange }: PlayerScoresProps) {
	const { data: player } = useMyPlayerRecord()
	const { data: events } = useClubEvents(season)
	const { data: playerRounds } = usePlayerScores(season, player?.id)

	const rounds = LoadRounds(events ?? [], playerRounds ?? [], isNet)

	// Derive unique courses from rounds
	const getUniqueCourses = (): CourseInRound[] => {
		const courseMap = new Map<number, CourseInRound>()
		for (const round of rounds) {
			if (!courseMap.has(round.course.id)) {
				courseMap.set(round.course.id, round.course)
			}
		}
		return Array.from(courseMap.values())
	}

	// Get holes for a course from the first round that has it
	const getHolesForCourse = (courseId: number): Hole[] => {
		const round = rounds.find((r) => r.course.id === courseId)
		return round?.holes ?? []
	}

	const busy = !playerRounds || !events

	const courses = getUniqueCourses().filter((c) => c.numberOfHoles === 9)

	// State for course filter
	const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])

	const handleToggleCourse = (courseId: number) => {
		setSelectedCourseIds((prev) => {
			if (prev.includes(courseId)) {
				return prev.filter((id) => id !== courseId)
			} else {
				return [...prev, courseId]
			}
		})
	}

	// Filter courses to display
	const displayedCourses =
		selectedCourseIds.length === 0 ? courses : courses.filter((c) => selectedCourseIds.includes(c.id))

	// Calculate filtered rounds for export
	const filteredRounds = rounds.filter((r) => {
		if (selectedCourseIds.length === 0) return true
		return selectedCourseIds.includes(r.course.id)
	})

	// Notify parent when filtered rounds change
	useEffect(() => {
		if (onFilteredRoundsChange) {
			onFilteredRoundsChange(filteredRounds)
		}
	}, [filteredRounds, onFilteredRoundsChange])

	return (
		<div className="mt-2">
			<OverlaySpinner loading={busy} />
			{!busy && courses.length > 0 && (
				<CourseFilterChips
					courses={courses}
					selectedCourseIds={selectedCourseIds}
					onToggleCourse={handleToggleCourse}
				/>
			)}
			<div className="row">
				{!busy &&
					displayedCourses.map((course) => {
						const courseRounds = rounds.filter((r) => r.course.id === course.id)
						const holes = getHolesForCourse(course.id)
						return (
							<div key={course.id} className="col-lg-4 col-md-12">
								<RoundsByCourse
									course={course}
									holes={holes}
									courseName={course.name}
									rounds={courseRounds}
								/>
							</div>
						)
					})}
			</div>
		</div>
	)
}
