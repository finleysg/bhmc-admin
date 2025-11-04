/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import individualExample from "../../json/individual-example.json"
import pointsExample from "../../json/points-example.json"
import proxyExample from "../../json/proxy-example.json"
import skinsExample from "../../json/skins-example.json"
import {
	BaseResultParser,
	PointsResultParser,
	ProxyResultParser,
	SkinsResultParser,
	StrokePlayResultParser,
} from "../result-parsers"

describe("BaseResultParser", () => {
	it("should validate valid response", () => {
		const error = BaseResultParser.validateResponse(pointsExample)
		expect(error).toBeNull()
	})

	it("should return error for invalid response", () => {
		const error = BaseResultParser.validateResponse({} as any)
		expect(error).toBe("Invalid or empty results data from Golf Genius")
	})

	it("should return error for response without scopes", () => {
		const invalidResponse = { event: {} }
		const error = BaseResultParser.validateResponse(invalidResponse as any)
		expect(error).toBe("No scopes found in results data")
	})

	it("should extract scopes from valid response", () => {
		const scopes = BaseResultParser.extractScopes(pointsExample)
		expect(scopes).toHaveLength(1)
		expect(scopes[0]).toHaveProperty("aggregates")
	})

	it("should extract aggregates from scope", () => {
		const scopes = BaseResultParser.extractScopes(pointsExample)
		const aggregates = BaseResultParser.extractAggregates(scopes[0])
		expect(aggregates.length).toBeGreaterThan(0)
		expect(aggregates[0]).toHaveProperty("name")
	})

	it("should extract member cards from aggregate", () => {
		const scopes = BaseResultParser.extractScopes(pointsExample)
		const aggregates = BaseResultParser.extractAggregates(scopes[0])
		const memberCards = BaseResultParser.extractMemberCards(aggregates[0])
		expect(memberCards.length).toBeGreaterThan(0)
		expect(memberCards[0]).toHaveProperty("member_card_id_str")
	})

	it("should extract flight name with default", () => {
		const scopes = BaseResultParser.extractScopes(pointsExample)
		const name = BaseResultParser.extractFlightName(scopes[0], "Default Flight")
		expect(typeof name).toBe("string")
	})
})

describe("PointsResultParser", () => {
	it("should parse player data correctly", () => {
		const scopes = BaseResultParser.extractScopes(pointsExample)
		const aggregates = BaseResultParser.extractAggregates(scopes[0])
		const memberCards = BaseResultParser.extractMemberCards(aggregates[0])

		const playerData = PointsResultParser.parsePlayerData(aggregates[0], memberCards[0])

		expect(playerData).toHaveProperty("rank")
		expect(playerData).toHaveProperty("points")
		expect(playerData).toHaveProperty("position")
		expect(playerData).toHaveProperty("total")
		expect(playerData).toHaveProperty("memberCardId")
		expect(playerData).toHaveProperty("playerName")
		expect(typeof playerData.memberCardId).toBe("string")
	})

	it("should format tied position correctly", () => {
		expect(PointsResultParser.formatPositionDetails("T1")).toBe("Tied for 1st place points")
		expect(PointsResultParser.formatPositionDetails("T2")).toBe("Tied for 2nd place points")
		expect(PointsResultParser.formatPositionDetails("T3")).toBe("Tied for 3rd place points")
		expect(PointsResultParser.formatPositionDetails("T11")).toBe("Tied for 11th place points")
		expect(PointsResultParser.formatPositionDetails("T21")).toBe("Tied for 21st place points")
	})

	it("should format regular position correctly", () => {
		expect(PointsResultParser.formatPositionDetails("1")).toBe("1st place points")
		expect(PointsResultParser.formatPositionDetails("2")).toBe("2nd place points")
		expect(PointsResultParser.formatPositionDetails("3")).toBe("3rd place points")
		expect(PointsResultParser.formatPositionDetails("11")).toBe("11th place points")
		expect(PointsResultParser.formatPositionDetails("21")).toBe("21st place points")
		expect(PointsResultParser.formatPositionDetails("42")).toBe("42nd place points")
	})

	it("should handle empty position", () => {
		expect(PointsResultParser.formatPositionDetails("")).toBe("No points awarded")
		expect(PointsResultParser.formatPositionDetails(null as any)).toBe("No points awarded")
		expect(PointsResultParser.formatPositionDetails(undefined as any)).toBe("No points awarded")
	})

	it("should handle invalid position", () => {
		expect(PointsResultParser.formatPositionDetails("ABC")).toBe("No points awarded")
		expect(PointsResultParser.formatPositionDetails("T-1")).toBe("No points awarded")
	})
})

describe("SkinsResultParser", () => {
	it("should parse player data correctly", () => {
		const scopes = BaseResultParser.extractScopes(skinsExample)
		const aggregates = BaseResultParser.extractAggregates(scopes[0])
		const memberCards = BaseResultParser.extractMemberCards(aggregates[0])

		const playerData = SkinsResultParser.parsePlayerData(aggregates[0], memberCards[0])

		expect(playerData).toHaveProperty("purse")
		expect(playerData).toHaveProperty("total")
		expect(playerData).toHaveProperty("details")
		expect(playerData).toHaveProperty("memberCardId")
		expect(playerData).toHaveProperty("playerName")
		expect(typeof playerData.memberCardId).toBe("string")
	})

	it("should handle missing purse with default", () => {
		const aggregate = { name: "Test Player" } as any
		const memberCard = { member_card_id_str: "123" } as any

		const playerData = SkinsResultParser.parsePlayerData(aggregate, memberCard)
		expect(playerData.purse).toBe("$0.00")
		expect(playerData.total).toBe("")
		expect(playerData.details).toBeNull()
	})
})

describe("ProxyResultParser", () => {
	it("should parse player data correctly", () => {
		const scopes = BaseResultParser.extractScopes(proxyExample)
		const aggregates = BaseResultParser.extractAggregates(scopes[0])
		const memberCards = BaseResultParser.extractMemberCards(aggregates[0])

		const playerData = ProxyResultParser.parsePlayerData(aggregates[0], memberCards[0])

		expect(playerData).toHaveProperty("purse")
		expect(playerData).toHaveProperty("rank")
		expect(playerData).toHaveProperty("memberCardId")
		expect(playerData).toHaveProperty("playerName")
		expect(typeof playerData.memberCardId).toBe("string")
	})

	it("should handle missing fields with defaults", () => {
		const aggregate = { name: "Test Player" } as any
		const memberCard = { member_card_id_str: "123" } as any

		const playerData = ProxyResultParser.parsePlayerData(aggregate, memberCard)
		expect(playerData.purse).toBe("$0.00")
		expect(playerData.rank).toBe("")
	})
})

describe("StrokePlayResultParser", () => {
	it("should parse player data correctly", () => {
		const scopes = BaseResultParser.extractScopes(individualExample)
		const aggregates = BaseResultParser.extractAggregates(scopes[0])
		const memberCards = BaseResultParser.extractMemberCards(aggregates[0])

		const playerData = StrokePlayResultParser.parsePlayerData(aggregates[0], memberCards[0])

		expect(playerData).toHaveProperty("purse")
		expect(playerData).toHaveProperty("position")
		expect(playerData).toHaveProperty("total")
		expect(playerData).toHaveProperty("memberCardId")
		expect(playerData).toHaveProperty("playerName")
		expect(typeof playerData.memberCardId).toBe("string")
	})

	it("should handle missing fields with defaults", () => {
		const aggregate = { name: "Test Player" } as any
		const memberCard = { member_card_id_str: "123" } as any

		const playerData = StrokePlayResultParser.parsePlayerData(aggregate, memberCard)
		expect(playerData.purse).toBe("$0.00")
		expect(playerData.position).toBe("")
		expect(playerData.total).toBe("")
	})
})

// Integration tests with real example data
describe("Integration Tests with Example Data", () => {
	it("should process points example data", () => {
		const scopes = BaseResultParser.extractScopes(pointsExample)
		expect(scopes.length).toBeGreaterThan(0)

		scopes.forEach((scope) => {
			const aggregates = BaseResultParser.extractAggregates(scope)
			aggregates.forEach((aggregate) => {
				const memberCards = BaseResultParser.extractMemberCards(aggregate)
				memberCards.forEach((memberCard) => {
					const playerData = PointsResultParser.parsePlayerData(aggregate, memberCard)
					expect(playerData.playerName).toBeTruthy()
					expect(playerData.memberCardId).toBeTruthy()
				})
			})
		})
	})

	it("should process skins example data", () => {
		const scopes = BaseResultParser.extractScopes(skinsExample)
		expect(scopes.length).toBeGreaterThan(0)

		scopes.forEach((scope) => {
			const aggregates = BaseResultParser.extractAggregates(scope)
			aggregates.forEach((aggregate) => {
				const memberCards = BaseResultParser.extractMemberCards(aggregate)
				memberCards.forEach((memberCard) => {
					const playerData = SkinsResultParser.parsePlayerData(aggregate, memberCard)
					expect(playerData.playerName).toBeTruthy()
					expect(playerData.memberCardId).toBeTruthy()
				})
			})
		})
	})

	it("should process proxy example data", () => {
		const scopes = BaseResultParser.extractScopes(proxyExample)
		expect(scopes.length).toBeGreaterThan(0)

		scopes.forEach((scope) => {
			const aggregates = BaseResultParser.extractAggregates(scope)
			aggregates.forEach((aggregate) => {
				const memberCards = BaseResultParser.extractMemberCards(aggregate)
				memberCards.forEach((memberCard) => {
					const playerData = ProxyResultParser.parsePlayerData(aggregate, memberCard)
					expect(playerData.playerName).toBeTruthy()
					expect(playerData.memberCardId).toBeTruthy()
				})
			})
		})
	})

	it("should process individual example data", () => {
		const scopes = BaseResultParser.extractScopes(individualExample)
		expect(scopes.length).toBeGreaterThan(0)

		scopes.forEach((scope) => {
			const aggregates = BaseResultParser.extractAggregates(scope)
			aggregates.forEach((aggregate) => {
				const memberCards = BaseResultParser.extractMemberCards(aggregate)
				memberCards.forEach((memberCard) => {
					const playerData = StrokePlayResultParser.parsePlayerData(aggregate, memberCard)
					expect(playerData.playerName).toBeTruthy()
					expect(playerData.memberCardId).toBeTruthy()
				})
			})
		})
	})
})
