import { LowScoresImportService } from "../low-scores-import.service"

// =============================================================================
// Test Fixtures
// =============================================================================

function createScorecard(playerId: number, holeScores: number[]) {
	return {
		id: playerId * 100,
		eventId: 1,
		playerId,
		courseId: 1,
		courseHandicap: 0,
		handicapIndex: null,
		teeId: null,
		scores: holeScores.map((score, i) => ({
			id: playerId * 1000 + i,
			scorecardId: playerId * 100,
			holeId: i + 1,
			score,
			isNet: 0,
		})),
	}
}

const mockEvent = {
	id: 1,
	season: 2026,
	ggId: "123",
	eventRounds: [],
	tournaments: [],
	eventFees: [],
	courses: [{ id: 1, name: "East", numberOfHoles: 9, holes: [], tees: [] }],
}

// =============================================================================
// Mock Setup
// =============================================================================

function createMocks() {
	const core = {
		findLowScores: jest.fn().mockResolvedValue([]),
		createLowScore: jest.fn().mockResolvedValue({ id: 1 }),
		deleteLowScores: jest.fn().mockResolvedValue(undefined),
		existsLowScore: jest.fn().mockResolvedValue(false),
	}
	const scores = {
		findScorecardsByEventAndCourse: jest.fn().mockResolvedValue([]),
	}
	const events = {
		getCompleteClubEventById: jest.fn().mockResolvedValue(mockEvent),
	}
	const service = new LowScoresImportService(core as any, scores as any, events as any)
	return { service, core, scores, events }
}

// =============================================================================
// Tests
// =============================================================================

describe("LowScoresImportService", () => {
	describe("importLowScores", () => {
		it("skips all-zero gross scorecards and uses real scores", async () => {
			const { service, core, scores } = createMocks()
			const realScorecard = createScorecard(1, [5, 4, 3, 5, 4, 5, 3, 4, 4]) // total = 37
			const zeroScorecard = createScorecard(2, [0, 0, 0, 0, 0, 0, 0, 0, 0]) // total = 0

			scores.findScorecardsByEventAndCourse.mockResolvedValue([realScorecard, zeroScorecard])

			await service.importLowScores(1)

			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ score: 37, playerId: 1, isNet: 0 }),
			)
			// Should NOT create a low score of 0
			expect(core.createLowScore).not.toHaveBeenCalledWith(expect.objectContaining({ score: 0 }))
		})

		it("skips negative net scorecards from unsubmitted scores", async () => {
			const { service, core, scores } = createMocks()
			const realScorecard = createScorecard(1, [4, 3, 3, 4, 3, 4, 2, 3, 3]) // total = 29
			const negativeScorecard = createScorecard(2, [-1, -1, 0, -1, -1, 0, -1, -1, -1]) // total = -7

			scores.findScorecardsByEventAndCourse.mockResolvedValue([realScorecard, negativeScorecard])

			await service.importLowScores(1)

			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ score: 29, playerId: 1, isNet: 1 }),
			)
			expect(core.createLowScore).not.toHaveBeenCalledWith(expect.objectContaining({ score: -7 }))
		})

		it("does not crash and creates no low scores when all scorecards are zeros", async () => {
			const { service, core, scores } = createMocks()
			const zero1 = createScorecard(1, [0, 0, 0, 0, 0, 0, 0, 0, 0])
			const zero2 = createScorecard(2, [0, 0, 0, 0, 0, 0, 0, 0, 0])

			scores.findScorecardsByEventAndCourse.mockResolvedValue([zero1, zero2])

			const result = await service.importLowScores(1)

			expect(core.createLowScore).not.toHaveBeenCalled()
			expect(core.deleteLowScores).not.toHaveBeenCalled()
			expect(result).toEqual({ East: 0 })
		})

		it("replaces invalid existing low scores (<=0) with valid ones", async () => {
			const { service, core, scores } = createMocks()
			const scorecard = createScorecard(1, [5, 4, 3, 5, 4, 5, 3, 4, 4]) // total = 37

			scores.findScorecardsByEventAndCourse.mockResolvedValue([scorecard])
			// Existing low scores are invalid (0 gross, -11 net from previous bug)
			core.findLowScores.mockResolvedValue([{ score: 0 }])

			await service.importLowScores(1)

			expect(core.deleteLowScores).toHaveBeenCalledWith(2026, "East", false)
			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ score: 37, playerId: 1 }),
			)
		})

		it("creates new low score when lower than existing", async () => {
			const { service, core, scores } = createMocks()
			const scorecard = createScorecard(1, [5, 4, 3, 5, 4, 5, 3, 4, 4]) // total = 37

			scores.findScorecardsByEventAndCourse.mockResolvedValue([scorecard])
			core.findLowScores.mockResolvedValue([{ score: 40 }])

			await service.importLowScores(1)

			expect(core.deleteLowScores).toHaveBeenCalledWith(2026, "East", false)
			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ score: 37, playerId: 1 }),
			)
		})

		it("adds tied player without duplicating existing", async () => {
			const { service, core, scores } = createMocks()
			const existingPlayer = createScorecard(1, [5, 4, 3, 5, 4, 5, 3, 4, 4]) // 37
			const newTiePlayer = createScorecard(2, [4, 5, 3, 5, 4, 5, 3, 4, 4]) // 37

			scores.findScorecardsByEventAndCourse.mockResolvedValue([existingPlayer, newTiePlayer])
			core.findLowScores.mockResolvedValue([{ score: 37 }])
			// gross: player 1 exists, player 2 new; net: player 1 exists, player 2 new
			core.existsLowScore
				.mockResolvedValueOnce(true) // gross player 1
				.mockResolvedValueOnce(false) // gross player 2
				.mockResolvedValueOnce(true) // net player 1
				.mockResolvedValueOnce(false) // net player 2

			await service.importLowScores(1)

			expect(core.deleteLowScores).not.toHaveBeenCalled()
			expect(core.createLowScore).toHaveBeenCalledTimes(2) // one gross + one net for player 2
			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ playerId: 2, isNet: 0 }),
			)
			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ playerId: 2, isNet: 1 }),
			)
		})

		it("excludes scorecards with fewer scores than the course has holes (DNF, missing rows)", async () => {
			const { service, core, scores } = createMocks()
			const completeScorecard = createScorecard(1, [5, 4, 3, 5, 4, 5, 3, 4, 4]) // 9 holes, total = 37
			// Player walked off after 5 holes — only 5 score rows exist for the scorecard
			const partialScorecard = createScorecard(2, [3, 4, 3, 4, 3]) // 5 holes, total = 17

			scores.findScorecardsByEventAndCourse.mockResolvedValue([completeScorecard, partialScorecard])

			await service.importLowScores(1)

			// The complete scorecard wins, not the partial one with the lower total
			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ score: 37, playerId: 1 }),
			)
			expect(core.createLowScore).not.toHaveBeenCalledWith(expect.objectContaining({ playerId: 2 }))
			expect(core.createLowScore).not.toHaveBeenCalledWith(expect.objectContaining({ score: 17 }))
		})

		it("excludes scorecards with zero-score holes (DNF, full row count but unplayed holes)", async () => {
			const { service, core, scores } = createMocks()
			const completeScorecard = createScorecard(1, [5, 4, 3, 5, 4, 5, 3, 4, 4]) // total = 37
			// Player walked off — scorecard has 9 rows but unplayed holes stored as 0
			const partialScorecard = createScorecard(2, [3, 4, 3, 4, 3, 0, 0, 0, 0]) // total = 17

			scores.findScorecardsByEventAndCourse.mockResolvedValue([completeScorecard, partialScorecard])

			await service.importLowScores(1)

			expect(core.createLowScore).toHaveBeenCalledWith(
				expect.objectContaining({ score: 37, playerId: 1 }),
			)
			expect(core.createLowScore).not.toHaveBeenCalledWith(expect.objectContaining({ playerId: 2 }))
		})

		it("does not create low scores when current scores are higher", async () => {
			const { service, core, scores } = createMocks()
			const scorecard = createScorecard(1, [5, 5, 4, 5, 5, 5, 4, 5, 5]) // total = 43

			scores.findScorecardsByEventAndCourse.mockResolvedValue([scorecard])
			core.findLowScores.mockResolvedValue([{ score: 37 }])

			await service.importLowScores(1)

			expect(core.deleteLowScores).not.toHaveBeenCalled()
			expect(core.createLowScore).not.toHaveBeenCalled()
		})
	})
})
