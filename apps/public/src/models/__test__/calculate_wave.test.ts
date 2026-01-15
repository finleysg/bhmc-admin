import { describe, it, expect } from "vitest"
import { calculateWave } from "../reserve"

describe("calculateWave", () => {
	it("distributes remainder to first waves (21 groups, 5 waves)", () => {
		const totalGroups = 21
		const signupWaves = 5
		// Wave sizes: [5, 4, 4, 4, 4]
		const expected = [
			1,
			1,
			1,
			1,
			1, // 0-4
			2,
			2,
			2,
			2, // 5-8
			3,
			3,
			3,
			3, // 9-12
			4,
			4,
			4,
			4, // 13-16
			5,
			5,
			5,
			5, // 17-20
		]
		for (let i = 0; i < totalGroups; i++) {
			expect(calculateWave(i, totalGroups, signupWaves)).toBe(expected[i])
		}
	})

	it("distributes remainder to first waves (22 groups, 4 waves)", () => {
		const totalGroups = 22
		const signupWaves = 4
		// Wave sizes: [6, 6, 5, 5]
		const expected = [
			1,
			1,
			1,
			1,
			1,
			1, // 0-5
			2,
			2,
			2,
			2,
			2,
			2, // 6-11
			3,
			3,
			3,
			3,
			3, // 12-16
			4,
			4,
			4,
			4,
			4, // 17-21
		]
		for (let i = 0; i < totalGroups; i++) {
			expect(calculateWave(i, totalGroups, signupWaves)).toBe(expected[i])
		}
	})

	it("handles no remainder (20 groups, 4 waves)", () => {
		const totalGroups = 20
		const signupWaves = 4
		// Wave sizes: [5, 5, 5, 5]
		const expected = [
			1,
			1,
			1,
			1,
			1, // 0-4
			2,
			2,
			2,
			2,
			2, // 5-9
			3,
			3,
			3,
			3,
			3, // 10-14
			4,
			4,
			4,
			4,
			4, // 15-19
		]
		for (let i = 0; i < totalGroups; i++) {
			expect(calculateWave(i, totalGroups, signupWaves)).toBe(expected[i])
		}
	})

	it("returns 0 when signupWaves is null or <= 0", () => {
		expect(calculateWave(0, 10, null)).toBe(0)
		expect(calculateWave(0, 10, 0)).toBe(0)
		expect(calculateWave(0, 10, -1)).toBe(0)
	})
})
