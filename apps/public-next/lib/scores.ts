import type {
	ClubEvent,
	Hole,
	HoleScoreData,
	PlayerRoundData,
	ScoreCourse,
	ScoreTee,
} from "./types"

export class ScoreByHole {
	hole: Hole
	score: string

	constructor(obj: { hole: Hole; score: number; places?: number }) {
		this.hole = obj.hole
		this.score = obj.score.toFixed(obj.places ?? 0)
	}

	relativeScoreName(): string {
		const score = +this.score
		const par = this.hole.par
		if (score === par) return "par"
		if (score === par - 1) return "birdie"
		if (score === par - 2) return "eagle"
		if (score === par - 3) return "double-eagle"
		if (score === par + 1) return "bogey"
		if (score === par + 2) return "double-bogey"
		return "other"
	}

	relativeScoreToPar(): string {
		return +this.score < this.hole.par ? "below-par" : "above-par"
	}
}

export interface Round {
	course: ScoreCourse
	tee: ScoreTee
	eventName: string
	eventDate: string
	scores: ScoreByHole[]
	holes: Hole[]
}

function getUniqueHoles(scores: HoleScoreData[]): Hole[] {
	const uniqueHoles = new Map<number, Hole>()
	for (const s of scores) {
		if (!uniqueHoles.has(s.hole.id)) {
			uniqueHoles.set(s.hole.id, s.hole)
		}
	}
	return Array.from(uniqueHoles.values()).sort((a, b) => a.hole_number - b.hole_number)
}

export function loadRounds(
	events: ClubEvent[],
	playerRounds: PlayerRoundData[],
	isNet: boolean,
): Round[] {
	const rounds: Round[] = []

	for (const pr of playerRounds) {
		const clubEvent = events.find((e) => e.id === pr.event)
		if (!clubEvent) continue

		const filteredScores = pr.scores.filter((s) => s.is_net === isNet)
		const scoresByHole = filteredScores.map(
			(s) => new ScoreByHole({ hole: s.hole, score: s.score }),
		)
		const holes = getUniqueHoles(filteredScores)

		rounds.push({
			course: pr.course,
			tee: pr.tee,
			eventName: clubEvent.name,
			eventDate: clubEvent.start_date,
			scores: scoresByHole,
			holes,
		})
	}

	return rounds
}

export function calculateAverageScores(rounds: Round[], holes: Hole[]): ScoreByHole[] {
	return holes.map((hole) => {
		const scores = rounds
			.map((round) => round.scores.find((s) => s.hole.id === hole.id))
			.filter((s): s is ScoreByHole => s !== undefined)
		const total = scores.reduce((sum, s) => sum + +s.score, 0)
		return new ScoreByHole({
			hole,
			score: scores.length > 0 ? total / scores.length : 0,
			places: 1,
		})
	})
}

export function calculateBestScores(rounds: Round[], holes: Hole[]): ScoreByHole[] {
	return holes.map((hole) => {
		const scores = rounds
			.map((round) => round.scores.find((s) => s.hole.id === hole.id))
			.filter((s): s is ScoreByHole => s !== undefined)
		const allScores = scores.map((s) => +s.score)
		const lowScore = allScores.length > 0 ? Math.min(...allScores) : 0
		return new ScoreByHole({ hole, score: lowScore })
	})
}
