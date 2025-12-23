import type { GgTournament } from "../api-data"
import { mapTournament } from "./mappers"

// Helper to create a valid GgTournament with required fields
const createTournament = (overrides: Partial<GgTournament> = {}): GgTournament => ({
	id: "123",
	name: "Test Tournament",
	score_format: "stroke",
	handicap_format: "net",
	score_scope: "pos_player",
	result_scope: "rs_flight",
	score_aggregation: "total",
	...overrides,
})

describe("mapTournament", () => {
	it("should return basic tournament mapping when all minimal fields present", () => {
		const tournament = createTournament()

		const result = mapTournament(tournament)

		expect(result).toEqual({
			id: "123",
			name: "Test Tournament",
			scoreFormat: "stroke",
			handicapFormat: "net",
		})
	})

	it("should map basic non-stroke score format", () => {
		const tournament = createTournament({
			score_format: "skins",
		})

		const result = mapTournament(tournament)

		expect(result.scoreFormat).toBe("skins")
	})

	it("should map handicap format", () => {
		const tournament = createTournament({
			handicap_format: "gross",
		})

		const result = mapTournament(tournament)

		expect(result.handicapFormat).toBe("gross")
	})

	describe("stroke format conversion logic", () => {
		it("should convert stroke to points when name contains 'points'", () => {
			const tournament = createTournament({
				name: "Member Points Championship",
				score_format: "stroke",
			})

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("points")
		})

		it("should convert stroke to points when name contains 'points' case insensitive", () => {
			const tournament = createTournament({
				name: "MEMBER POINTS CHAMPIONSHIP",
				score_format: "stroke",
			})

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("points")
		})

		it("should convert stroke to team when score_scope is pos_group (and name doesn't contain points)", () => {
			const tournament = createTournament({
				name: "Team Championship",
				score_format: "stroke",
				score_scope: "pos_group",
			})

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("team")
		})

		it("should keep stroke when score_scope is pos_player (and name doesn't contain points)", () => {
			const tournament = createTournament({
				name: "Individual Championship",
				score_format: "stroke",
				score_scope: "pos_player",
			})

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("stroke")
		})

		it("should keep stroke when score_scope has unknown value (and name doesn't contain points)", () => {
			const tournament = createTournament({
				name: "Regular Championship",
				score_format: "stroke",
				score_scope: "unknown_scope",
			})

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("stroke")
		})

		it("should prioritize points detection over score_scope", () => {
			const tournament = createTournament({
				name: "Points Tournament",
				score_format: "stroke",
				score_scope: "pos_group", // This should be ignored because name has "points"
			})

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("points")
		})
	})
})
