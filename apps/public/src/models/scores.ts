import { z } from "zod"

import { isoDayFormat } from "../utils/date-utils"
import { ClubEvent } from "./club-event"
import { Hole, HoleApiSchema } from "./course"

// Minimal course schema (without holes array) used in round responses
export const CourseInRoundApiSchema = z.object({
	id: z.number(),
	name: z.string(),
	number_of_holes: z.number(),
})

export const TeeApiSchema = z.object({
	id: z.number(),
	course: z.number(),
	name: z.string(),
	gg_id: z.string().nullable(),
})

export const HoleScoreApiSchema = z.object({
	id: z.number(),
	hole: HoleApiSchema,
	score: z.number(),
	is_net: z.boolean(),
})

export const PlayerRoundApiSchema = z.object({
	id: z.number(),
	event: z.number(),
	player: z.number(),
	course: CourseInRoundApiSchema,
	tee: TeeApiSchema,
	handicap_index: z.string().nullable(),
	course_handicap: z.number(),
	scores: z.array(HoleScoreApiSchema),
})

export type CourseInRoundData = z.infer<typeof CourseInRoundApiSchema>
export type TeeData = z.infer<typeof TeeApiSchema>
export type HoleScoreData = z.infer<typeof HoleScoreApiSchema>
export type PlayerRoundData = z.infer<typeof PlayerRoundApiSchema>

export class CourseInRound {
	id: number
	name: string
	numberOfHoles: number

	constructor(data: CourseInRoundData) {
		this.id = data.id
		this.name = data.name
		this.numberOfHoles = data.number_of_holes
	}
}

export class Tee {
	id: number
	courseId: number
	name: string
	ggId: string | null

	constructor(data: TeeData) {
		this.id = data.id
		this.courseId = data.course
		this.name = data.name
		this.ggId = data.gg_id
	}
}

export class HoleScore {
	id: number
	hole: Hole
	score: number
	isNet: boolean

	constructor(data: HoleScoreData) {
		this.id = data.id
		this.hole = new Hole(data.hole)
		this.score = data.score
		this.isNet = data.is_net
	}
}

export class PlayerRound {
	id: number
	eventId: number
	playerId: number
	course: CourseInRound
	tee: Tee
	handicapIndex: string | null
	courseHandicap: number
	scores: HoleScore[]

	constructor(data: PlayerRoundData) {
		this.id = data.id
		this.eventId = data.event
		this.playerId = data.player
		this.course = new CourseInRound(data.course)
		this.tee = new Tee(data.tee)
		this.handicapIndex = data.handicap_index
		this.courseHandicap = data.course_handicap
		this.scores = data.scores.map((s) => new HoleScore(s))
	}

	get holes(): Hole[] {
		const uniqueHoles = new Map<number, Hole>()
		for (const score of this.scores) {
			if (!uniqueHoles.has(score.hole.id)) {
				uniqueHoles.set(score.hole.id, score.hole)
			}
		}
		return Array.from(uniqueHoles.values()).sort((a, b) => a.holeNumber - b.holeNumber)
	}
}

export class ScoreByHole {
	hole: Hole
	score: string

	constructor(obj: { hole: Hole; score: number; places?: number }) {
		this.hole = obj.hole
		this.score = obj.score.toFixed(obj.places ?? 0)
	}

	relativeScoreName = () => {
		if (+this.score === this.hole.par) {
			return "par"
		} else if (+this.score === this.hole.par - 1) {
			return "birdie"
		} else if (+this.score === this.hole.par - 2) {
			return "eagle"
		} else if (+this.score === this.hole.par - 3) {
			return "double-eagle"
		} else if (+this.score === this.hole.par + 1) {
			return "bogey"
		} else if (+this.score === this.hole.par + 2) {
			return "double-bogey"
		} else {
			return "other"
		}
	}

	relativeScoreToPar = () => {
		if (+this.score < this.hole.par) {
			return "below-par"
		} else {
			return "above-par"
		}
	}
}

export class Round {
	course: CourseInRound
	eventName: string
	eventDate: string
	scores: ScoreByHole[]
	holes: Hole[]

	constructor(course: CourseInRound, event: ClubEvent, scores: ScoreByHole[], holes: Hole[]) {
		this.course = course
		this.eventName = event.name
		this.eventDate = isoDayFormat(event.startDate)
		this.scores = scores
		this.holes = holes
	}
}

export const LoadRounds = (events: ClubEvent[], playerRounds: PlayerRound[], isNet: boolean) => {
	const rounds: Round[] = []

	for (const playerRound of playerRounds) {
		const clubEvent = events.find((e) => e.id === playerRound.eventId)
		if (clubEvent) {
			const filteredScores = playerRound.scores.filter((s) => s.isNet === isNet)
			const scoresByHole = filteredScores.map((s) => new ScoreByHole(s))
			rounds.push(new Round(playerRound.course, clubEvent, scoresByHole, playerRound.holes))
		}
	}

	return rounds
}
