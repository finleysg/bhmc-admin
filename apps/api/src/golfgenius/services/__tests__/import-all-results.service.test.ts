import { ImportAllResultsService } from "../import-all-results.service"

// =============================================================================
// Test Fixtures
// =============================================================================

function makeTournament(overrides: Record<string, unknown>) {
	return {
		id: 1,
		eventId: 10,
		roundId: 1,
		name: "Saturday Senior Gross Skins",
		format: "skins",
		isNet: false,
		ggId: "t-1",
		ggSpecId: null,
		...overrides,
	}
}

const mockClubEvent = {
	id: 10,
	ggId: "evt-1",
	eventRounds: [{ id: 1, eventId: 10, roundNumber: 1, roundDate: "2026-08-01", ggId: "r1" }],
	tournaments: [] as unknown[],
}

// Aggregate shapes taken from the real two-day championship results payload
// (Gross Senior Championship, 2026 Senior Club Championship).
const winnerAggregate = {
	id: 1,
	id_str: "agg-1",
	member_ids: [1],
	member_ids_str: ["m-1"],
	member_cards: [
		{ member_id: 1, member_id_str: "m-1", member_card_id: 11, member_card_id_str: "mc-1" },
	],
	position: "1",
	rank: "1",
	name: "Todd Fenwick",
	score: "+4",
	stableford: null,
	total: "148",
	purse: "$120.00",
	net_scores: [],
	gross_scores: [],
}

const unpaidAggregate = {
	...winnerAggregate,
	id_str: "agg-2",
	member_ids_str: ["m-2"],
	member_cards: [
		{ member_id: 2, member_id_str: "m-2", member_card_id: 12, member_card_id_str: "mc-2" },
	],
	position: "--",
	rank: "7",
	name: "Tod Jaeger",
	total: "159",
	purse: "",
}

const withdrawnAggregate = {
	...winnerAggregate,
	id_str: "agg-3",
	member_ids_str: ["m-3"],
	member_cards: [
		{ member_id: 3, member_id_str: "m-3", member_card_id: 13, member_card_id_str: "mc-3" },
	],
	position: "11",
	rank: "21",
	name: "Michael Moriarity",
	score: "-",
	total: "WD",
	purse: "",
}

// Synthetic: a non-numeric total on a paid row must not produce a NaN score
const paidNonNumericAggregate = {
	...withdrawnAggregate,
	id_str: "agg-4",
	purse: "$40.00",
}

// =============================================================================
// Mock Setup
// =============================================================================

function createMocks(tournaments: unknown[]) {
	const apiClient = {
		getTournamentResults: jest.fn().mockResolvedValue({ id: 1, adjusted: false, scopes: [] }),
	}
	let completeResolve: (value: unknown) => void
	const completed = new Promise((resolve) => (completeResolve = resolve))
	const progressTracker = {
		startTournamentTracking: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
		emitTournamentProgress: jest.fn(),
		completeOperation: jest.fn().mockImplementation((_eventId, result) => {
			completeResolve(result)
			return Promise.resolve()
		}),
		errorOperation: jest.fn().mockImplementation((_eventId, _action, message) => {
			completeResolve({ hardError: message })
			return Promise.resolve()
		}),
	}
	const eventsService = {
		getCompleteClubEventById: jest.fn().mockResolvedValue({ ...mockClubEvent, tournaments }),
		deleteTournamentResults: jest.fn().mockResolvedValue(undefined),
		insertTournamentResults: jest.fn().mockResolvedValue(undefined),
	}
	const registrationService = {
		getPlayerMapForEvent: jest.fn().mockResolvedValue(
			new Map([
				["m-1", { id: 101, firstName: "Todd", lastName: "Fenwick" }],
				["m-2", { id: 102, firstName: "Tod", lastName: "Jaeger" }],
				["m-3", { id: 103, firstName: "Michael", lastName: "Moriarity" }],
			]),
		),
	}
	const service = new ImportAllResultsService(
		apiClient as any,
		progressTracker as any,
		eventsService as any,
		registrationService as any,
	)
	return { service, apiClient, progressTracker, eventsService, completed }
}

// =============================================================================
// Tests
// =============================================================================

describe("ImportAllResultsService", () => {
	describe("importAllResultsStream", () => {
		it("excludes any tournament with 'overall' in the name (case-insensitive)", async () => {
			const tournaments = [
				makeTournament({ id: 1, name: "Overall" }),
				makeTournament({ id: 2, name: "Saturday Overall", format: "stroke" }),
				makeTournament({ id: 3, name: "Sunday overall", format: "stroke" }),
				makeTournament({ id: 4, name: "Saturday Senior Gross Skins" }),
			]
			const { service, progressTracker, completed } = createMocks(tournaments)

			await service.importAllResultsStream(10)
			await completed

			expect(progressTracker.startTournamentTracking).toHaveBeenCalledWith(10, 1)
		})

		it("continues with remaining tournaments when one cannot be mapped", async () => {
			const tournaments = [
				// roundId 99 does not exist on the event -> toTournamentData throws
				makeTournament({ id: 1, roundId: 99 }),
				makeTournament({ id: 2 }),
			]
			const { service, apiClient, progressTracker, completed } = createMocks(tournaments)

			await service.importAllResultsStream(10)
			const result = (await completed) as { errors: { itemName: string }[] }

			expect(result.errors).toHaveLength(1)
			expect(result.errors[0].itemName).toBe("Saturday Senior Gross Skins")
			// The healthy tournament was still fetched and processed
			expect(apiClient.getTournamentResults).toHaveBeenCalledTimes(1)
			expect(progressTracker.completeOperation).toHaveBeenCalled()
			expect(progressTracker.errorOperation).not.toHaveBeenCalled()
		})

		it("does not delete existing results when the Golf Genius fetch fails", async () => {
			const tournaments = [makeTournament({ id: 1 })]
			const { service, apiClient, eventsService, completed } = createMocks(tournaments)
			apiClient.getTournamentResults.mockRejectedValue(new Error("404 Not Found"))

			await service.importAllResultsStream(10)
			const result = (await completed) as { errors: { error: string }[] }

			expect(eventsService.deleteTournamentResults).not.toHaveBeenCalled()
			expect(result.errors.some((e) => e.error.includes("404"))).toBe(true)
		})

		it("deletes existing results only after a successful fetch", async () => {
			const tournaments = [makeTournament({ id: 1 })]
			const { service, apiClient, eventsService, completed } = createMocks(tournaments)

			await service.importAllResultsStream(10)
			await completed

			expect(apiClient.getTournamentResults).toHaveBeenCalled()
			expect(eventsService.deleteTournamentResults).toHaveBeenCalledWith(1)
			const fetchOrder = apiClient.getTournamentResults.mock.invocationCallOrder[0]
			const deleteOrder = eventsService.deleteTournamentResults.mock.invocationCallOrder[0]
			expect(fetchOrder).toBeLessThan(deleteOrder)
		})
	})

	describe("stroke results from a two-day tournament", () => {
		function prepare(service: ImportAllResultsService, aggregate: unknown) {
			const result = {
				tournamentId: 1,
				tournamentName: "",
				eventName: "",
				resultsImported: 0,
				errors: [],
			}
			const playerMap = new Map([
				["m-1", { id: 101 }],
				["m-2", { id: 102 }],
				["m-3", { id: 103 }],
			])
			return (service as any).prepareStrokePlayerResult(
				{ id: 1, name: "Gross Senior Championship", format: "stroke" },
				aggregate,
				"Flight 1",
				result,
				playerMap,
			)
		}

		it("imports a paid finisher with the cumulative total", () => {
			const { service } = createMocks([])
			const record = prepare(service, winnerAggregate)

			expect(record).not.toBeNull()
			expect(record.playerId).toBe(101)
			expect(record.position).toBe(1)
			expect(record.score).toBe(148)
			expect(record.amount).toBe("120.00")
			expect(record.flight).toBe("Flight 1")
		})

		it("drops unpaid rows (position '--', empty purse)", () => {
			const { service } = createMocks([])
			expect(prepare(service, unpaidAggregate)).toBeNull()
		})

		it("drops withdrawn players (total 'WD', empty purse)", () => {
			const { service } = createMocks([])
			expect(prepare(service, withdrawnAggregate)).toBeNull()
		})

		it("stores a null score, not NaN, for a paid row with a non-numeric total", () => {
			const { service } = createMocks([])
			const record = prepare(service, paidNonNumericAggregate)

			expect(record).not.toBeNull()
			expect(record.score).toBeNull()
			expect(record.amount).toBe("40.00")
		})
	})
})
