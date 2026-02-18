import { snakeToCamelKeys } from "../snake-to-camel"

describe("snakeToCamelKeys", () => {
	it("converts basic snake_case keys to camelCase", () => {
		const input = { first_name: "John", last_name: "Doe" }
		expect(snakeToCamelKeys(input)).toEqual({ firstName: "John", lastName: "Doe" })
	})

	it("converts nested objects recursively", () => {
		const input = {
			player_data: {
				first_name: "Jane",
				phone_number: "555-1234",
			},
		}
		expect(snakeToCamelKeys(input)).toEqual({
			playerData: {
				firstName: "Jane",
				phoneNumber: "555-1234",
			},
		})
	})

	it("converts arrays of objects", () => {
		const input = [
			{ slot_id: 1, starting_order: 0 },
			{ slot_id: 2, starting_order: 1 },
		]
		expect(snakeToCamelKeys(input)).toEqual([
			{ slotId: 1, startingOrder: 0 },
			{ slotId: 2, startingOrder: 1 },
		])
	})

	it("appends Id suffix for FK fields", () => {
		const fkFields = new Set(["event_fee", "registration_slot"])
		const input = { event_fee: 5, registration_slot: 10, amount: "5.00" }
		expect(snakeToCamelKeys(input, fkFields)).toEqual({
			eventFeeId: 5,
			registrationSlotId: 10,
			amount: "5.00",
		})
	})

	it("does not append Id suffix when FK field value is an object", () => {
		const fkFields = new Set(["event_fee"])
		const input = { event_fee: { id: 5, name: "Green Fee" } }
		expect(snakeToCamelKeys(input, fkFields)).toEqual({
			eventFee: { id: 5, name: "Green Fee" },
		})
	})

	it("passes through null values", () => {
		expect(snakeToCamelKeys(null)).toBeNull()
	})

	it("passes through Date instances without converting", () => {
		const date = new Date("2024-01-01")
		expect(snakeToCamelKeys(date)).toBe(date)
	})

	it("passes through primitive values", () => {
		expect(snakeToCamelKeys("hello")).toBe("hello")
		expect(snakeToCamelKeys(42)).toBe(42)
		expect(snakeToCamelKeys(true)).toBe(true)
	})

	it("handles empty object", () => {
		expect(snakeToCamelKeys({})).toEqual({})
	})

	it("handles keys without underscores", () => {
		const input = { id: 1, name: "Test" }
		expect(snakeToCamelKeys(input)).toEqual({ id: 1, name: "Test" })
	})
})
