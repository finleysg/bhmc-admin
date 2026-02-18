import { ScoreByHole, loadRounds, calculateAverageScores, calculateBestScores } from "../scores"
import type { ClubEvent, Hole, PlayerRoundData } from "../types"

const hole1: Hole = { id: 1, course_id: 1, hole_number: 1, par: 4 }
const hole2: Hole = { id: 2, course_id: 1, hole_number: 2, par: 3 }
const hole3: Hole = { id: 3, course_id: 1, hole_number: 3, par: 5 }

describe("ScoreByHole", () => {
	it("returns par for score equal to par", () => {
		const s = new ScoreByHole({ hole: hole1, score: 4 })
		expect(s.relativeScoreName()).toBe("par")
	})

	it("returns birdie for one under par", () => {
		const s = new ScoreByHole({ hole: hole1, score: 3 })
		expect(s.relativeScoreName()).toBe("birdie")
	})

	it("returns eagle for two under par", () => {
		const s = new ScoreByHole({ hole: hole3, score: 3 })
		expect(s.relativeScoreName()).toBe("eagle")
	})

	it("returns double-eagle for three under par", () => {
		const s = new ScoreByHole({ hole: hole3, score: 2 })
		expect(s.relativeScoreName()).toBe("double-eagle")
	})

	it("returns bogey for one over par", () => {
		const s = new ScoreByHole({ hole: hole1, score: 5 })
		expect(s.relativeScoreName()).toBe("bogey")
	})

	it("returns double-bogey for two over par", () => {
		const s = new ScoreByHole({ hole: hole1, score: 6 })
		expect(s.relativeScoreName()).toBe("double-bogey")
	})

	it("returns other for more than two over par", () => {
		const s = new ScoreByHole({ hole: hole1, score: 7 })
		expect(s.relativeScoreName()).toBe("other")
	})

	it("returns below-par for score under par", () => {
		const s = new ScoreByHole({ hole: hole1, score: 3 })
		expect(s.relativeScoreToPar()).toBe("below-par")
	})

	it("returns above-par for score at or over par", () => {
		const s = new ScoreByHole({ hole: hole1, score: 4 })
		expect(s.relativeScoreToPar()).toBe("above-par")
	})

	it("formats score to specified decimal places", () => {
		const s = new ScoreByHole({ hole: hole1, score: 3.667, places: 1 })
		expect(s.score).toBe("3.7")
	})

	it("defaults to 0 decimal places", () => {
		const s = new ScoreByHole({ hole: hole1, score: 4 })
		expect(s.score).toBe("4")
	})
})

describe("loadRounds", () => {
	const events: ClubEvent[] = [
		{
			id: 10,
			event_type: "N",
			name: "Event A",
			season: 2024,
			start_date: "2024-06-01",
			status: "S",
		},
		{
			id: 20,
			event_type: "N",
			name: "Event B",
			season: 2024,
			start_date: "2024-07-01",
			status: "S",
		},
	]

	const playerRound: PlayerRoundData = {
		id: 1,
		event: 10,
		player: 100,
		course: { id: 1, name: "East", number_of_holes: 9, color: null },
		tee: { id: 1, course: 1, name: "White", gg_id: null, color: null },
		handicap_index: "10.0",
		course_handicap: 12,
		scores: [
			{ id: 1, hole: hole1, score: 4, is_net: false },
			{ id: 2, hole: hole2, score: 3, is_net: false },
			{ id: 3, hole: hole1, score: 3, is_net: true },
			{ id: 4, hole: hole2, score: 2, is_net: true },
		],
	}

	it("filters gross scores correctly", () => {
		const rounds = loadRounds(events, [playerRound], false)
		expect(rounds).toHaveLength(1)
		expect(rounds[0].scores).toHaveLength(2)
		expect(rounds[0].scores[0].score).toBe("4")
	})

	it("filters net scores correctly", () => {
		const rounds = loadRounds(events, [playerRound], true)
		expect(rounds).toHaveLength(1)
		expect(rounds[0].scores).toHaveLength(2)
		expect(rounds[0].scores[0].score).toBe("3")
	})

	it("skips rounds with no matching event", () => {
		const orphanRound: PlayerRoundData = { ...playerRound, event: 999 }
		const rounds = loadRounds(events, [orphanRound], false)
		expect(rounds).toHaveLength(0)
	})

	it("sets event name and date from club event", () => {
		const rounds = loadRounds(events, [playerRound], false)
		expect(rounds[0].eventName).toBe("Event A")
		expect(rounds[0].eventDate).toBe("2024-06-01")
	})

	it("returns empty array for empty inputs", () => {
		expect(loadRounds([], [], false)).toHaveLength(0)
	})
})

describe("calculateAverageScores", () => {
	it("calculates average for multiple rounds", () => {
		const holes = [hole1, hole2]
		const rounds = [
			{
				course: { id: 1, name: "East", number_of_holes: 9, color: null },
				tee: { id: 1, course: 1, name: "White", gg_id: null, color: null },
				eventName: "A",
				eventDate: "2024-06-01",
				scores: [
					new ScoreByHole({ hole: hole1, score: 4 }),
					new ScoreByHole({ hole: hole2, score: 4 }),
				],
				holes,
			},
			{
				course: { id: 1, name: "East", number_of_holes: 9, color: null },
				tee: { id: 1, course: 1, name: "White", gg_id: null, color: null },
				eventName: "B",
				eventDate: "2024-07-01",
				scores: [
					new ScoreByHole({ hole: hole1, score: 6 }),
					new ScoreByHole({ hole: hole2, score: 2 }),
				],
				holes,
			},
		]

		const avg = calculateAverageScores(rounds, holes)
		expect(avg).toHaveLength(2)
		expect(avg[0].score).toBe("5.0")
		expect(avg[1].score).toBe("3.0")
	})

	it("handles empty rounds", () => {
		const avg = calculateAverageScores([], [hole1])
		expect(avg[0].score).toBe("0.0")
	})
})

describe("calculateBestScores", () => {
	it("finds the lowest score per hole", () => {
		const holes = [hole1, hole2]
		const rounds = [
			{
				course: { id: 1, name: "East", number_of_holes: 9, color: null },
				tee: { id: 1, course: 1, name: "White", gg_id: null, color: null },
				eventName: "A",
				eventDate: "2024-06-01",
				scores: [
					new ScoreByHole({ hole: hole1, score: 5 }),
					new ScoreByHole({ hole: hole2, score: 4 }),
				],
				holes,
			},
			{
				course: { id: 1, name: "East", number_of_holes: 9, color: null },
				tee: { id: 1, course: 1, name: "White", gg_id: null, color: null },
				eventName: "B",
				eventDate: "2024-07-01",
				scores: [
					new ScoreByHole({ hole: hole1, score: 3 }),
					new ScoreByHole({ hole: hole2, score: 3 }),
				],
				holes,
			},
		]

		const best = calculateBestScores(rounds, holes)
		expect(best[0].score).toBe("3")
		expect(best[1].score).toBe("3")
	})
})
