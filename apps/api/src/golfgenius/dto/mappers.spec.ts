import type { GgTournamentDto } from "./golf-genius.dto"
import { mapTournament } from "./mappers"

describe("mapTournament", () => {
	it("should throw error when id is missing", () => {
		const tournament: GgTournamentDto = {
			name: "Test Tournament",
			// id is missing
		}

		expect(() => mapTournament(tournament)).toThrow(
			"Tournament missing required fields: id=undefined, name=Test Tournament",
		)
	})

	it("should throw error when name is missing", () => {
		const tournament: GgTournamentDto = {
			id: "123",
			// name is missing
		}

		expect(() => mapTournament(tournament)).toThrow(
			"Tournament missing required fields: id=123, name=undefined",
		)
	})

	it("should return basic tournament mapping when all minimal fields present", () => {
		const tournament: GgTournamentDto = {
			id: "123",
			name: "Test Tournament",
		}

		const result = mapTournament(tournament)

		expect(result).toEqual({
			id: "123",
			name: "Test Tournament",
			scoreFormat: "",
			handicapFormat: "",
		})
	})

	it("should map basic non-stroke score format", () => {
		const tournament: GgTournamentDto = {
			id: "123",
			name: "Test Tournament",
			score_format: "skins",
		}

		const result = mapTournament(tournament)

		expect(result.scoreFormat).toBe("skins")
	})

	it("should map handicap format", () => {
		const tournament: GgTournamentDto = {
			id: "123",
			name: "Test Tournament",
			handicap_format: "net",
		}

		const result = mapTournament(tournament)

		expect(result.handicapFormat).toBe("net")
	})

	describe("stroke format conversion logic", () => {
		it("should convert stroke to points when name contains 'points'", () => {
			const tournament: GgTournamentDto = {
				id: "123",
				name: "Member Points Championship",
				score_format: "stroke",
			}

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("points")
		})

		it("should convert stroke to points when name contains 'points' case insensitive", () => {
			const tournament: GgTournamentDto = {
				id: "123",
				name: "MEMBER POINTS CHAMPIONSHIP",
				score_format: "stroke",
			}

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("points")
		})

		it("should convert stroke to team when score_scope is pos_group (and name doesn't contain points)", () => {
			const tournament: GgTournamentDto = {
				id: "123",
				name: "Team Championship",
				score_format: "stroke",
				score_scope: "pos_group",
			}

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("team")
		})

		it("should keep stroke when score_scope is pos_player (and name doesn't contain points)", () => {
			const tournament: GgTournamentDto = {
				id: "123",
				name: "Individual Championship",
				score_format: "stroke",
				score_scope: "pos_player",
			}

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("stroke")
		})

		it("should keep stroke when score_scope is missing or unknown (and name doesn't contain points)", () => {
			const tournament: GgTournamentDto = {
				id: "123",
				name: "Regular Championship",
				score_format: "stroke",
			}

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("stroke")
		})

		it("should keep stroke when score_scope has unknown value (and name doesn't contain points)", () => {
			const tournament: GgTournamentDto = {
				id: "123",
				name: "Regular Championship",
				score_format: "stroke",
				score_scope: "unknown_scope",
			}

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("stroke")
		})

		it("should prioritize points detection over score_scope", () => {
			const tournament: GgTournamentDto = {
				id: "123",
				name: "Points Tournament",
				score_format: "stroke",
				score_scope: "pos_group", // This should be ignored because name has "points"
			}

			const result = mapTournament(tournament)

			expect(result.scoreFormat).toBe("points")
		})
	})

	it("should handle null values in DTO", () => {
		const tournament: GgTournamentDto = {
			id: "123",
			name: "Test Tournament",
			score_format: null,
			handicap_format: null,
		}

		const result = mapTournament(tournament)

		expect(result.scoreFormat).toBe("")
		expect(result.handicapFormat).toBe("")
	})

	it("should handle undefined optional values", () => {
		const tournament: GgTournamentDto = {
			id: "123",
			name: "Test Tournament",
			score_format: undefined,
			handicap_format: undefined,
		}

		const result = mapTournament(tournament)

		expect(result.scoreFormat).toBe("")
		expect(result.handicapFormat).toBe("")
	})
})
