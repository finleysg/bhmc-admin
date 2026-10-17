import { GgTeesheetResponseSchema } from "../../api-data"
import { TeesheetImportService } from "../teesheet-import.service"

// =============================================================================
// Test Fixtures
// =============================================================================

const tee = {
	name: "White",
	abbreviation: "W",
	hole_data: {
		par: [4, 4, 4, 4, 4, 4, 4, 4, 4],
		yardage: [400, 400, 400, 400, 400, 400, 400, 400, 400],
		handicap: [1, 2, 3, 4, 5, 6, 7, 8, 9],
	},
	id: "tee-1",
	course_id: "course-1",
	slope_and_rating: {
		all18: { rating: 70.1, slope: 125 },
		front9: { rating: 35.0, slope: 124 },
		back9: { rating: 35.1, slope: 126 },
	},
	nine_hole_course: false,
}

function ggPlayer(overrides: Record<string, unknown> = {}) {
	return {
		name: "Player One",
		last_name: "One",
		first_name: "Player",
		position: 1,
		member_card_id: null,
		player_roster_id: "roster-1",
		handicap_network_id: "hn-1",
		player_round_id: "pr-1",
		external_id: null,
		group_number: 1,
		team_name: "",
		handicap_index: "10.0",
		course_handicap: "11",
		score_array: [],
		handicap_dots_by_hole: [],
		tee,
		custom_fields: { bhmc_player_id: "42" },
		...overrides,
	}
}

function ggPairingGroup(overrides: Record<string, unknown> = {}) {
	return {
		id: "pg-1",
		hole: "1",
		tee_time: "5:00 PM",
		date: "2026-08-12",
		foursome_ggid: "ggid-1",
		players: [ggPlayer()],
		...overrides,
	}
}

// =============================================================================
// Mock Setup
// =============================================================================

function createMocks(pairingGroups: unknown[], startType: string | null = "TT") {
	const events = {
		findEventById: jest.fn().mockResolvedValue({ id: 1, ggId: "evt-1", startType }),
		findRoundsByEventId: jest.fn().mockResolvedValue([{ id: 5, roundNumber: 1, ggId: "r1" }]),
	}
	const courses = {
		findCourseByGgId: jest.fn().mockResolvedValue({ id: 7, name: "East" }),
		findTeeByGgId: jest.fn().mockResolvedValue({ id: 8 }),
		findHolesByCourseId: jest.fn().mockResolvedValue([{ id: 9, holeNumber: 1 }]),
	}
	const apiClient = {
		getRoundTeeSheet: jest.fn().mockResolvedValue(pairingGroups),
	}
	const progressTracker = {
		startTracking: jest.fn(),
		emitProgress: jest.fn(),
		completeOperation: jest.fn().mockResolvedValue(undefined),
		errorOperation: jest.fn().mockResolvedValue(undefined),
	}
	const pairings = {
		deleteByEventId: jest.fn().mockResolvedValue(undefined),
		insert: jest.fn().mockResolvedValue(undefined),
	}
	const service = new TeesheetImportService(
		events as any,
		courses as any,
		apiClient as any,
		progressTracker as any,
		pairings as any,
	)
	return { service, pairings, progressTracker }
}

async function runImport(service: TeesheetImportService) {
	await (service as any).processImportAsync(1)
}

// =============================================================================
// Tests
// =============================================================================

describe("GgTeesheetResponseSchema", () => {
	it("accepts a null tee_time (round without assigned tee times)", () => {
		const response = [{ pairing_group: ggPairingGroup({ tee_time: null }) }]
		const result = GgTeesheetResponseSchema.safeParse(response)
		expect(result.success).toBe(true)
	})
})

describe("TeesheetImportService", () => {
	it("stores the tee time when Golf Genius provides one", async () => {
		const { service, pairings } = createMocks([ggPairingGroup()])

		await runImport(service)

		expect(pairings.insert).toHaveBeenCalledWith(expect.objectContaining({ teeTime: "5:00 PM" }))
	})

	it("stores an empty tee time when Golf Genius returns null", async () => {
		const { service, pairings, progressTracker } = createMocks([ggPairingGroup({ tee_time: null })])

		await runImport(service)

		expect(pairings.insert).toHaveBeenCalledWith(expect.objectContaining({ teeTime: "" }))
		expect(progressTracker.completeOperation).toHaveBeenCalledWith(
			1,
			expect.objectContaining({ created: 1, skipped: 0 }),
		)
	})

	it("reports missing tee times as an error for a tee-time event", async () => {
		const { service, progressTracker } = createMocks(
			[ggPairingGroup(), ggPairingGroup({ id: "pg-2", tee_time: null })],
			"TT",
		)

		await runImport(service)

		expect(progressTracker.completeOperation).toHaveBeenCalledWith(
			1,
			expect.objectContaining({
				created: 2,
				errors: [
					{
						itemName: "Round 1",
						error: "1 of 2 pairing groups have no tee time assigned in Golf Genius",
					},
				],
			}),
		)
	})

	it("does not report missing tee times for a shotgun event", async () => {
		const { service, progressTracker } = createMocks([ggPairingGroup({ tee_time: null })], "SG")

		await runImport(service)

		expect(progressTracker.completeOperation).toHaveBeenCalledWith(
			1,
			expect.objectContaining({ created: 1, errors: [] }),
		)
	})
})
