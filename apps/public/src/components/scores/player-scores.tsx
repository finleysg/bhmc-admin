import { useState, useMemo } from "react"
import { useClubEvents } from "../../hooks/use-club-events"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { usePlayerScores } from "../../hooks/use-player-scores"
import { Hole } from "../../models/course"
import { CourseInRound, LoadRounds, Round, ScoreByHole } from "../../models/scores"
import { currentSeason } from "../../utils/app-config"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import {
	AverageScore,
	HoleNumbers,
	HolePars,
	HoleScore,
	HolesProps,
	RoundScores,
	RoundTotal,
	ScoresByHoleProps,
} from "./score-utils"
import { ExportScoresButton } from "./export-scores-button"

type ScoreType = "gross" | "net" | "both"

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

interface RoundsByCourseProps extends HolesProps {
	course: CourseInRound
	grossRounds: Round[]
	netRounds: Round[]
	scoreType: ScoreType
}

function RoundsByCourse({
	course,
	holes,
	courseName,
	grossRounds,
	netRounds,
	scoreType,
}: RoundsByCourseProps) {
	const calculateAverageScores = (rounds: Round[]) => {
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

	const calculateBestScores = (rounds: Round[]) => {
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

	const showGross = scoreType === "gross" || scoreType === "both"
	const rounds = showGross ? grossRounds : netRounds
	const hasRounds = rounds.length > 0

	return (
		<div className="card mb-2">
			<div className={headerClass(course)}>
				<span>{course.name}</span>
			</div>
			{hasRounds ? (
				<div className="card-body">
					<HoleNumbers holes={holes} courseName={courseName} />
					<HolePars holes={holes} courseName={courseName} />
					{scoreType === "both"
						? // Interleave gross and net rounds by date
							grossRounds.map((grossRound) => {
								const netRound = netRounds.find((r) => r.eventDate === grossRound.eventDate)
								return (
									<div key={grossRound.eventDate}>
										<RoundScores round={grossRound} scoreType="Gross" />
										{netRound && <RoundScores round={netRound} scoreType="Net" />}
									</div>
								)
							})
						: rounds.map((round) => (
								<RoundScores
									key={round.eventDate}
									round={round}
									scoreType={showGross ? "Gross" : "Net"}
								/>
							))}
					<hr />
					<AverageRound scores={calculateAverageScores(rounds)} />
					<BestBallRound scores={calculateBestScores(rounds)} />
				</div>
			) : (
				<div className="card-body">No rounds played</div>
			)}
		</div>
	)
}

export function PlayerScores() {
	const { data: player } = useMyPlayerRecord()

	// Filter state
	const [selectedSeason, setSelectedSeason] = useState<number>(currentSeason)
	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [scoreType, setScoreType] = useState<ScoreType>("gross")

	const { data: events } = useClubEvents(selectedSeason)
	const { data: playerRounds } = usePlayerScores(selectedSeason, player?.id)

	const grossRounds = useMemo(
		() => LoadRounds(events ?? [], playerRounds ?? [], false),
		[events, playerRounds],
	)

	const netRounds = useMemo(
		() => LoadRounds(events ?? [], playerRounds ?? [], true),
		[events, playerRounds],
	)

	// Derive unique courses from rounds
	const courses = useMemo(() => {
		const courseMap = new Map<number, CourseInRound>()
		for (const round of grossRounds) {
			if (!courseMap.has(round.course.id)) {
				courseMap.set(round.course.id, round.course)
			}
		}
		return Array.from(courseMap.values()).filter((c) => c.numberOfHoles === 9)
	}, [grossRounds])

	// Get holes for a course from the first round that has it
	const getHolesForCourse = (courseId: number): Hole[] => {
		const round = grossRounds.find((r) => r.course.id === courseId)
		return round?.holes ?? []
	}

	// Filter courses to display
	const displayedCourses =
		selectedCourseId === null ? courses : courses.filter((c) => c.id === selectedCourseId)

	// Derive courseIds for export
	const exportCourseIds = useMemo(() => {
		return selectedCourseId !== null ? [selectedCourseId] : undefined
	}, [selectedCourseId])

	// Generate season options (current year down to 2021)
	const seasonOptions = useMemo(() => {
		const seasons: number[] = []
		for (let year = currentSeason; year >= 2021; year--) {
			seasons.push(year)
		}
		return seasons
	}, [])

	const busy = !playerRounds || !events

	return (
		<div className="mt-2">
			<OverlaySpinner loading={busy} />
			<h2 className="mb-4 text-primary">My Scores</h2>
			{/* Filter Controls */}
			<div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
				<select
					className="form-select form-select-sm"
					style={{ width: "auto" }}
					value={selectedCourseId ?? ""}
					onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
				>
					<option value="">All Courses</option>
					{courses.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>

				<select
					className="form-select form-select-sm"
					style={{ width: "auto" }}
					value={scoreType}
					onChange={(e) => setScoreType(e.target.value as ScoreType)}
				>
					<option value="gross">Gross</option>
					<option value="net">Net</option>
					<option value="both">Both</option>
				</select>

				<select
					className="form-select form-select-sm"
					style={{ width: "auto" }}
					value={selectedSeason}
					onChange={(e) => setSelectedSeason(Number(e.target.value))}
				>
					{seasonOptions.map((year) => (
						<option key={year} value={year}>
							{year}
						</option>
					))}
					<option value={0}>All</option>
				</select>

				<ExportScoresButton
					season={selectedSeason}
					courseIds={exportCourseIds}
					scoreType={scoreType}
					disabled={busy || grossRounds.length === 0}
				/>
			</div>

			<div className="row">
				{!busy &&
					displayedCourses.map((course) => {
						const courseGrossRounds = grossRounds.filter((r) => r.course.id === course.id)
						const courseNetRounds = netRounds.filter((r) => r.course.id === course.id)
						const holes = getHolesForCourse(course.id)
						return (
							<div key={course.id} className="col-lg-4 col-md-12">
								<RoundsByCourse
									course={course}
									holes={holes}
									courseName={course.name}
									grossRounds={courseGrossRounds}
									netRounds={courseNetRounds}
									scoreType={scoreType}
								/>
							</div>
						)
					})}
			</div>
		</div>
	)
}
