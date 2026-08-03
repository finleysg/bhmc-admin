import { EventSyncService } from "../event-sync.service"

// =============================================================================
// Test Fixtures — shapes taken from real Golf Genius responses for the
// 2026 Senior Club Championship (a two-day event).
// =============================================================================

const ggEvent = { id: "evt-1", website: "www.golfgenius.com/pages/1" }

const ggRound1 = { id: "r1", index: 1, event_id: "evt-1", date: "2026-08-01" }
const ggRound2 = { id: "r2", index: 2, event_id: "evt-1", date: "2026-08-02" }

function ggTournament(overrides: Record<string, unknown>) {
	return {
		id: "t-default",
		name: "Default Tournament",
		tournament_spec_id: "spec-default",
		score_format: "stroke",
		handicap_format: "usga_net",
		score_scope: "member",
		result_scope: "rs_flight",
		score_aggregation: null,
		...overrides,
	}
}

// A two-day cumulative tournament: listed under BOTH rounds with the same id.
// Note the "Gross" tournament reports a net handicap_format (real GG behavior
// for flighted gross/net pairs).
const grossChampionship = ggTournament({
	id: "champ-gross-new",
	name: "Gross Senior Championship - Senior Division",
	tournament_spec_id: "spec-champ",
	handicap_format: "usga_net",
})

const netChampionship = ggTournament({
	id: "champ-net-new",
	name: "Net Senior Championship - Senior Division",
	tournament_spec_id: "spec-champ",
	handicap_format: "usga_net",
})

// Round-specific tournaments
const saturdaySkins = ggTournament({
	id: "skins-sat",
	name: "Saturday Senior Gross Skins - Senior Skins",
	tournament_spec_id: "spec-skins-sat",
	score_format: "skins",
	handicap_format: "gross",
})

const sundaySkins = ggTournament({
	id: "skins-sun",
	name: "Sunday Senior Gross Skins - Senior Skins",
	tournament_spec_id: "spec-skins-sun",
	score_format: "skins",
	handicap_format: "gross",
})

const localEvent = {
	id: 10,
	name: "Senior Club Championship",
	startDate: "2026-08-01",
	ggId: null,
	portalUrl: null,
}

// =============================================================================
// Mock Setup
// =============================================================================

function createMocks(options?: {
	existingRounds?: unknown[]
	existingTournaments?: unknown[]
	rounds?: unknown[]
	tournamentsByRound?: Record<string, unknown[]>
}) {
	let nextId = 100
	const apiClient = {
		findMatchingEventByStartDate: jest.fn().mockResolvedValue(ggEvent),
		getEventRounds: jest.fn().mockResolvedValue(options?.rounds ?? [ggRound1, ggRound2]),
		getRoundTournaments: jest
			.fn()
			.mockImplementation((_eventId: string, roundId: string) =>
				Promise.resolve(options?.tournamentsByRound?.[roundId] ?? []),
			),
	}
	const events = {
		findEventById: jest.fn().mockResolvedValue({ ...localEvent }),
		updateEvent: jest.fn().mockResolvedValue(undefined),
		findRoundsByEventId: jest.fn().mockResolvedValue(options?.existingRounds ?? []),
		updateRound: jest.fn().mockResolvedValue(undefined),
		createRound: jest.fn().mockImplementation(() => Promise.resolve({ id: nextId++ })),
		findTournamentsByEventId: jest.fn().mockResolvedValue(options?.existingTournaments ?? []),
		updateTournament: jest.fn().mockResolvedValue(undefined),
		createTournament: jest.fn().mockImplementation(() => Promise.resolve({ id: nextId++ })),
	}
	const courses = {}
	const service = new EventSyncService(apiClient as any, events as any, courses as any)
	return { service, apiClient, events }
}

// =============================================================================
// Tests
// =============================================================================

describe("EventSyncService.syncEvent", () => {
	describe("two-day events", () => {
		it("creates a cross-round tournament once, bound to the first round", async () => {
			const { service, events } = createMocks({
				tournamentsByRound: {
					r1: [grossChampionship, saturdaySkins],
					r2: [grossChampionship, sundaySkins],
				},
			})

			const summary = await service.syncEvent(10)

			expect(summary.tournamentsCreated).toBe(3)
			expect(summary.tournamentsUpdated).toBe(0)
			expect(summary.errors).toEqual([])

			const created = events.createTournament.mock.calls.map((c) => c[0])
			const champ = created.filter((d) => d.ggId === "champ-gross-new")
			expect(champ).toHaveLength(1)
			// Bound to round 1 (the first local round id created is 100)
			expect(champ[0].roundId).toBe(100)
			expect(champ[0].ggSpecId).toBe("spec-champ")
		})

		it("keeps the first-round binding when re-syncing an existing cross-round tournament", async () => {
			const existing = {
				id: 55,
				name: grossChampionship.name,
				ggId: "champ-gross-new",
				ggSpecId: "spec-champ",
			}
			const { service, events } = createMocks({
				existingRounds: [
					{ id: 1, ggId: "r1" },
					{ id: 2, ggId: "r2" },
				],
				existingTournaments: [existing],
				tournamentsByRound: {
					r1: [grossChampionship],
					r2: [grossChampionship],
				},
			})

			const summary = await service.syncEvent(10)

			expect(summary.tournamentsUpdated).toBe(1)
			expect(summary.tournamentsCreated).toBe(0)
			expect(events.updateTournament).toHaveBeenCalledTimes(1)
			expect(events.updateTournament.mock.calls[0][1].roundId).toBe(1)
		})
	})

	describe("recreated tournaments", () => {
		it("matches by name when Golf Genius recreated the tournament with a new id", async () => {
			const existing = {
				id: 55,
				name: grossChampionship.name,
				ggId: "champ-gross-OLD",
				ggSpecId: null,
			}
			const { service, events } = createMocks({
				existingRounds: [{ id: 1, ggId: "r1" }],
				rounds: [ggRound1],
				existingTournaments: [existing],
				tournamentsByRound: { r1: [grossChampionship] },
			})

			const summary = await service.syncEvent(10)

			expect(summary.tournamentsCreated).toBe(0)
			expect(summary.tournamentsUpdated).toBe(1)
			const [id, data] = events.updateTournament.mock.calls[0]
			expect(id).toBe(55)
			expect(data.ggId).toBe("champ-gross-new")
			expect(data.ggSpecId).toBe("spec-champ")
		})

		it("matches by spec id when the tournament was recreated AND renamed", async () => {
			// Real case: "Saturday Master Net Skins - Master Net Skins" was recreated
			// as "Saturday Master Net Skins - Master Skins" with a new id.
			const existing = {
				id: 56,
				name: "Saturday Senior Gross Skins - OLD FLIGHT NAME",
				ggId: "skins-sat-OLD",
				ggSpecId: "spec-skins-sat",
			}
			const { service, events } = createMocks({
				existingRounds: [{ id: 1, ggId: "r1" }],
				rounds: [ggRound1],
				existingTournaments: [existing],
				tournamentsByRound: { r1: [saturdaySkins] },
			})

			const summary = await service.syncEvent(10)

			expect(summary.tournamentsCreated).toBe(0)
			expect(summary.tournamentsUpdated).toBe(1)
			const [id, data] = events.updateTournament.mock.calls[0]
			expect(id).toBe(56)
			expect(data.ggId).toBe("skins-sat")
			expect(data.name).toBe(saturdaySkins.name)
		})

		it("does not match by spec id when multiple candidates share it (gross/net pair)", async () => {
			// Gross and net views of a flighted tournament share a spec id. If both
			// were renamed, a spec-only match would be ambiguous — create instead.
			const existingGross = {
				id: 57,
				name: "Gross Championship - OLD",
				ggId: "champ-gross-OLD",
				ggSpecId: "spec-champ",
			}
			const existingNet = {
				id: 58,
				name: "Net Championship - OLD",
				ggId: "champ-net-OLD",
				ggSpecId: "spec-champ",
			}
			const { service, events } = createMocks({
				existingRounds: [{ id: 1, ggId: "r1" }],
				rounds: [ggRound1],
				existingTournaments: [existingGross, existingNet],
				tournamentsByRound: { r1: [grossChampionship, netChampionship] },
			})

			const summary = await service.syncEvent(10)

			expect(events.updateTournament).not.toHaveBeenCalled()
			expect(summary.tournamentsCreated).toBe(2)
			// The stale rows are reported, not deleted
			expect(summary.warnings).toHaveLength(2)
		})
	})

	describe("field derivation", () => {
		it("derives isNet from the name, not handicap_format, for gross/net pairs", async () => {
			const { service, events } = createMocks({
				rounds: [ggRound1],
				tournamentsByRound: { r1: [grossChampionship, netChampionship] },
			})

			await service.syncEvent(10)

			const created = events.createTournament.mock.calls.map((c) => c[0])
			expect(created.find((d) => d.ggId === "champ-gross-new")?.isNet).toBe(0)
			expect(created.find((d) => d.ggId === "champ-net-new")?.isNet).toBe(1)
		})

		it("falls back to handicap_format when the name has no gross/net hint", async () => {
			const proxy = ggTournament({
				id: "proxy-1",
				name: "Sat. 3E Proxy",
				score_format: "user_scored",
				handicap_format: "gross",
			})
			const { service, events } = createMocks({
				rounds: [ggRound1],
				tournamentsByRound: { r1: [proxy] },
			})

			await service.syncEvent(10)

			expect(events.createTournament.mock.calls[0][0].isNet).toBe(0)
		})

		it("derives points format from the name", async () => {
			const points = ggTournament({
				id: "points-1",
				name: "Senior Gross Points - Senior Division",
				handicap_format: "gross",
			})
			const { service, events } = createMocks({
				rounds: [ggRound1],
				tournamentsByRound: { r1: [points] },
			})

			await service.syncEvent(10)

			expect(events.createTournament.mock.calls[0][0].format).toBe("points")
		})
	})

	describe("one-day events (regression)", () => {
		it("first sync creates every tournament exactly as before", async () => {
			const skins = saturdaySkins
			const proxy = ggTournament({
				id: "proxy-1",
				name: "Sat. 3E Proxy",
				score_format: "user_scored",
				handicap_format: "gross",
			})
			const { service, events } = createMocks({
				rounds: [ggRound1],
				tournamentsByRound: { r1: [skins, proxy] },
			})

			const summary = await service.syncEvent(10)

			expect(summary.tournamentsCreated).toBe(2)
			expect(summary.tournamentsUpdated).toBe(0)
			expect(summary.errors).toEqual([])
			expect(summary.warnings).toEqual([])
			expect(events.createTournament).toHaveBeenCalledTimes(2)
		})

		it("re-sync updates by ggId exactly as before", async () => {
			const existing = {
				id: 60,
				name: saturdaySkins.name,
				ggId: "skins-sat",
				ggSpecId: null,
			}
			const { service, events } = createMocks({
				existingRounds: [{ id: 1, ggId: "r1" }],
				rounds: [ggRound1],
				existingTournaments: [existing],
				tournamentsByRound: { r1: [saturdaySkins] },
			})

			const summary = await service.syncEvent(10)

			expect(summary.tournamentsUpdated).toBe(1)
			expect(summary.tournamentsCreated).toBe(0)
			expect(events.updateTournament.mock.calls[0][0]).toBe(60)
		})
	})

	describe("error handling", () => {
		it("collects per-tournament errors without aborting the sync", async () => {
			const { service, events } = createMocks({
				rounds: [ggRound1],
				tournamentsByRound: { r1: [grossChampionship, saturdaySkins] },
			})
			events.createTournament
				.mockRejectedValueOnce(new Error("ER_DUP_ENTRY"))
				.mockResolvedValueOnce({ id: 200 })

			const summary = await service.syncEvent(10)

			expect(summary.tournamentsCreated).toBe(1)
			expect(summary.errors).toHaveLength(1)
			expect(summary.errors[0]).toContain(grossChampionship.name)
			expect(summary.errors[0]).toContain("ER_DUP_ENTRY")
			// The second tournament was still processed
			expect(events.createTournament).toHaveBeenCalledTimes(2)
		})
	})
})
