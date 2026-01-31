import {
	parseHandicapIndex,
	calculateCoursePar,
	calculateCourseHandicap,
	distributeStrokes,
} from "../handicap.utils"

describe("parseHandicapIndex", () => {
	describe("positive handicaps", () => {
		it("should parse simple handicap index", () => {
			expect(parseHandicapIndex("6.7")).toBe(6.7)
		})

		it("should parse integer handicap", () => {
			expect(parseHandicapIndex("10")).toBe(10)
		})

		it("should parse high handicap", () => {
			expect(parseHandicapIndex("36.4")).toBe(36.4)
		})

		it("should parse scratch handicap", () => {
			expect(parseHandicapIndex("0.0")).toBe(0)
		})
	})

	describe("plus handicaps (negative)", () => {
		it("should parse plus handicap as negative", () => {
			expect(parseHandicapIndex("+2.3")).toBe(-2.3)
		})

		it("should parse plus handicap integer as negative", () => {
			expect(parseHandicapIndex("+5")).toBe(-5)
		})

		it("should parse small plus handicap", () => {
			expect(parseHandicapIndex("+0.5")).toBe(-0.5)
		})
	})

	describe("empty/null/undefined inputs", () => {
		it("should return null for empty string", () => {
			expect(parseHandicapIndex("")).toBeNull()
		})

		it("should return null for whitespace-only string", () => {
			expect(parseHandicapIndex("   ")).toBeNull()
		})

		it("should return null for null input", () => {
			expect(parseHandicapIndex(null)).toBeNull()
		})

		it("should return null for undefined input", () => {
			expect(parseHandicapIndex(undefined)).toBeNull()
		})
	})

	describe("whitespace handling", () => {
		it("should handle leading whitespace", () => {
			expect(parseHandicapIndex("  6.7")).toBe(6.7)
		})

		it("should handle trailing whitespace", () => {
			expect(parseHandicapIndex("6.7  ")).toBe(6.7)
		})

		it("should handle whitespace with plus handicap", () => {
			expect(parseHandicapIndex("  +2.3  ")).toBe(-2.3)
		})
	})

	describe("invalid inputs", () => {
		it("should return null for non-numeric string", () => {
			expect(parseHandicapIndex("abc")).toBeNull()
		})

		it("should return null for plus sign only", () => {
			expect(parseHandicapIndex("+")).toBeNull()
		})

		it("should return null for plus with non-numeric", () => {
			expect(parseHandicapIndex("+abc")).toBeNull()
		})
	})
})

describe("calculateCoursePar", () => {
	it("should sum front 9 par values", () => {
		const parValues = [
			4,
			5,
			3,
			4,
			5,
			4,
			4,
			3,
			4,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		]
		expect(calculateCoursePar(parValues)).toBe(36)
	})

	it("should sum back 9 par values", () => {
		const parValues = [
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			4,
			4,
			3,
			5,
			4,
			4,
			5,
			3,
			4,
		]
		expect(calculateCoursePar(parValues)).toBe(36)
	})

	it("should sum full 18 holes", () => {
		const parValues = [4, 5, 3, 4, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4]
		expect(calculateCoursePar(parValues)).toBe(72)
	})

	it("should return 0 for all-null array", () => {
		const parValues = [
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
		]
		expect(calculateCoursePar(parValues)).toBe(0)
	})

	it("should return 0 for empty array", () => {
		expect(calculateCoursePar([])).toBe(0)
	})
})

describe("calculateCourseHandicap", () => {
	describe("9-hole formula", () => {
		it("should calculate 9-hole course handicap", () => {
			// Formula: (index/2) x (slope/113) + (rating - par)
			// (6.7/2) x (127/113) + (35.9 - 36) = 3.35 x 1.124 - 0.1 = 3.67 ≈ 4
			expect(calculateCourseHandicap(6.7, 127, 35.9, 36, true)).toBe(4)
		})

		it("should handle scratch handicap (0)", () => {
			// (0/2) x (slope/113) + (rating - par) = 0 + (35.9 - 36) = -0.1 ≈ 0
			expect(calculateCourseHandicap(0, 127, 35.9, 36, true)).toBe(0)
		})

		it("should handle plus handicap (negative index)", () => {
			// (-2/2) x (127/113) + (35.9 - 36) = -1 x 1.124 - 0.1 = -1.22 ≈ -1
			expect(calculateCourseHandicap(-2, 127, 35.9, 36, true)).toBe(-1)
		})

		it("should handle high handicap", () => {
			// (36/2) x (127/113) + (35.9 - 36) = 18 x 1.124 - 0.1 = 20.13 ≈ 20
			expect(calculateCourseHandicap(36, 127, 35.9, 36, true)).toBe(20)
		})
	})

	describe("18-hole formula", () => {
		it("should calculate 18-hole course handicap", () => {
			// Formula: index x (slope/113) + (rating - par)
			// 10 x (127/113) + (71.5 - 72) = 10 x 1.124 - 0.5 = 10.74 ≈ 11
			expect(calculateCourseHandicap(10, 127, 71.5, 72, false)).toBe(11)
		})

		it("should handle scratch handicap (0)", () => {
			// 0 x (slope/113) + (rating - par) = 0 + (71.5 - 72) = -0.5 ≈ 0
			expect(calculateCourseHandicap(0, 127, 71.5, 72, false)).toBe(0)
		})

		it("should handle plus handicap (negative index)", () => {
			// -3 x (127/113) + (71.5 - 72) = -3 x 1.124 - 0.5 = -3.87 ≈ -4
			expect(calculateCourseHandicap(-3, 127, 71.5, 72, false)).toBe(-4)
		})

		it("should handle high handicap", () => {
			// 36 x (127/113) + (71.5 - 72) = 36 x 1.124 - 0.5 = 39.96 ≈ 40
			expect(calculateCourseHandicap(36, 127, 71.5, 72, false)).toBe(40)
		})
	})
})

describe("distributeStrokes", () => {
	describe("plus handicaps (negative)", () => {
		it("should distribute negative strokes to hardest holes", () => {
			// Handicap -2: hardest 2 holes (SI 1,2) get -1
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(-2, strokeIndices)).toEqual([-1, -1, 0, 0, 0, 0, 0, 0, 0])
		})

		it("should handle single negative stroke", () => {
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(-1, strokeIndices)).toEqual([-1, 0, 0, 0, 0, 0, 0, 0, 0])
		})

		it("should handle plus handicap with non-sequential stroke indices", () => {
			// SI order: 1(pos0), 2(pos6), 3(pos7), 4(pos5), ...
			const strokeIndices = [1, 5, 8, 9, 6, 4, 2, 3, 7]
			// Handicap -3: SI 1,2,3 get -1 = positions 0, 6, 7
			expect(distributeStrokes(-3, strokeIndices)).toEqual([-1, 0, 0, 0, 0, 0, -1, -1, 0])
		})

		it("should handle very low plus handicap (multiple negative strokes per hole)", () => {
			// Handicap -10 on 9 holes: all get -1, hardest 1 (SI 1) gets -2
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(-10, strokeIndices)).toEqual([-2, -1, -1, -1, -1, -1, -1, -1, -1])
		})
	})

	describe("high handicaps (2+ strokes per hole)", () => {
		it("should give 2nd stroke to hardest holes when handicap exceeds hole count", () => {
			// Handicap 12 on 9 holes: all get 1, hardest 3 (SI 1,2,3) get 2nd stroke
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(12, strokeIndices)).toEqual([2, 2, 2, 1, 1, 1, 1, 1, 1])
		})

		it("should distribute 3+ strokes per hole for very high handicaps", () => {
			// Handicap 20 on 9 holes: all get 2, hardest 2 (SI 1,2) get 3rd stroke
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(20, strokeIndices)).toEqual([3, 3, 2, 2, 2, 2, 2, 2, 2])
		})

		it("should handle high handicap with non-sequential stroke indices", () => {
			// Handicap 11 on 9 holes with scrambled indices
			// SI order: 1(pos0), 2(pos6), 3(pos7), 4(pos5), 5(pos1), 6(pos4), 7(pos8), 8(pos2), 9(pos3)
			const strokeIndices = [1, 5, 8, 9, 6, 4, 2, 3, 7]
			// All 9 get 1 stroke, then SI 1,2 get 2nd stroke = positions 0, 6
			expect(distributeStrokes(11, strokeIndices)).toEqual([2, 1, 1, 1, 1, 1, 2, 1, 1])
		})
	})

	describe("normal handicaps", () => {
		it("should distribute 4 strokes to hardest 4 holes", () => {
			// Stroke indices: [1,5,8,9,6,4,2,3,7] - holes with SI 1,2,3,4 get strokes
			// Position 0 (SI=1), Position 6 (SI=2), Position 7 (SI=3), Position 5 (SI=4)
			const strokeIndices = [1, 5, 8, 9, 6, 4, 2, 3, 7]
			expect(distributeStrokes(4, strokeIndices)).toEqual([1, 0, 0, 0, 0, 1, 1, 1, 0])
		})

		it("should return zeroes for handicap 0", () => {
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(0, strokeIndices)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
		})

		it("should handle single stroke", () => {
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(1, strokeIndices)).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0])
		})

		it("should handle all holes getting one stroke", () => {
			const strokeIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]
			expect(distributeStrokes(9, strokeIndices)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])
		})

		it("should handle null values in stroke indices", () => {
			// Front 9 only - back 9 are null
			const strokeIndices = [
				1,
				2,
				3,
				4,
				5,
				6,
				7,
				8,
				9,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
				null,
			]
			expect(distributeStrokes(4, strokeIndices)).toEqual([
				1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			])
		})

		it("should handle all-null stroke indices", () => {
			const strokeIndices = [null, null, null, null, null, null, null, null, null]
			expect(distributeStrokes(4, strokeIndices)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
		})
	})
})
