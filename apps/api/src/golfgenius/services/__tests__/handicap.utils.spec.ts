import {
	parseHandicapIndex,
	calculateCoursePar,
	calculateCourseHandicap,
	distributeStrokes,
	calculateHandicapFromTeeData,
	TeeData,
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

describe("calculateHandicapFromTeeData", () => {
	// Helper to create 9-hole front tee data
	const createFront9TeeData = (overrides?: Partial<TeeData>): TeeData => ({
		nineHoleCourse: true,
		holeData: {
			par: [4, 5, 3, 4, 5, 4, 4, 3, 4, null, null, null, null, null, null, null, null, null],
			handicap: [1, 3, 9, 5, 7, 2, 4, 8, 6, null, null, null, null, null, null, null, null, null],
		},
		slopeAndRating: {
			all18: { rating: 71.5, slope: 127 },
			front9: { rating: 35.9, slope: 127 },
			back9: { rating: 35.6, slope: 125 },
		},
		...overrides,
	})

	// Helper to create 9-hole back tee data
	const createBack9TeeData = (): TeeData => ({
		nineHoleCourse: true,
		holeData: {
			par: [null, null, null, null, null, null, null, null, null, 4, 4, 3, 5, 4, 4, 5, 3, 4],
			handicap: [null, null, null, null, null, null, null, null, null, 1, 3, 9, 5, 7, 2, 4, 8, 6],
		},
		slopeAndRating: {
			all18: { rating: 71.5, slope: 127 },
			front9: { rating: 35.9, slope: 127 },
			back9: { rating: 35.6, slope: 125 },
		},
	})

	// Helper to create 18-hole tee data
	const create18HoleTeeData = (): TeeData => ({
		nineHoleCourse: false,
		holeData: {
			par: [4, 5, 3, 4, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 5, 3, 4],
			handicap: [1, 5, 17, 9, 13, 3, 7, 15, 11, 2, 6, 18, 10, 14, 4, 8, 16, 12],
		},
		slopeAndRating: {
			all18: { rating: 71.5, slope: 127 },
			front9: { rating: 35.9, slope: 127 },
			back9: { rating: 35.6, slope: 125 },
		},
	})

	describe("full calculation with sample tee data", () => {
		it("should calculate courseHandicap and handicapDotsByHole for 9-hole front", () => {
			const teeData = createFront9TeeData()
			// index=6.7, slope=127, rating=35.9, par=36, 9-hole -> 4
			const result = calculateHandicapFromTeeData("6.7", teeData)

			expect(result).not.toBeNull()
			expect(result!.courseHandicap).toBe(4)
			// 4 strokes distributed to SI 1,2,3,4 = positions 0,5,1,6
			expect(result!.handicapDotsByHole).toEqual([
				1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			])
		})

		it("should calculate for 9-hole back using back9 slope/rating", () => {
			const teeData = createBack9TeeData()
			// index=6.7, slope=125, rating=35.6, par=36, 9-hole
			// (6.7/2) x (125/113) + (35.6 - 36) = 3.35 x 1.106 - 0.4 = 3.31 ≈ 3
			const result = calculateHandicapFromTeeData("6.7", teeData)

			expect(result).not.toBeNull()
			expect(result!.courseHandicap).toBe(3)
			// 3 strokes distributed to SI 1,2,3 = positions 9,14,10
			expect(result!.handicapDotsByHole).toEqual([
				0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0,
			])
		})

		it("should calculate for 18-hole using all18 slope/rating", () => {
			const teeData = create18HoleTeeData()
			// index=10, slope=127, rating=71.5, par=72, 18-hole -> 11
			const result = calculateHandicapFromTeeData("10", teeData)

			expect(result).not.toBeNull()
			expect(result!.courseHandicap).toBe(11)
			// 11 strokes distributed to SI 1-11
			// handicap: [1, 5, 17, 9, 13, 3, 7, 15, 11, 2, 6, 18, 10, 14, 4, 8, 16, 12]
			// SI 1=pos0, 2=pos9, 3=pos5, 4=pos14, 5=pos1, 6=pos10, 7=pos6, 8=pos15, 9=pos3, 10=pos12, 11=pos8
			expect(result!.handicapDotsByHole).toEqual([
				1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0,
			])
		})
	})

	describe("empty/null handicap index", () => {
		it("should return null for empty handicap index", () => {
			const teeData = createFront9TeeData()
			expect(calculateHandicapFromTeeData("", teeData)).toBeNull()
		})

		it("should return null for null handicap index", () => {
			const teeData = createFront9TeeData()
			expect(calculateHandicapFromTeeData(null, teeData)).toBeNull()
		})

		it("should return null for undefined handicap index", () => {
			const teeData = createFront9TeeData()
			expect(calculateHandicapFromTeeData(undefined, teeData)).toBeNull()
		})
	})

	describe("slope/rating unavailable", () => {
		it("should return null when all18 slope is null for 18-hole", () => {
			const teeData = create18HoleTeeData()
			teeData.slopeAndRating.all18.slope = null
			expect(calculateHandicapFromTeeData("10", teeData)).toBeNull()
		})

		it("should return null when all18 rating is null for 18-hole", () => {
			const teeData = create18HoleTeeData()
			teeData.slopeAndRating.all18.rating = null
			expect(calculateHandicapFromTeeData("10", teeData)).toBeNull()
		})

		it("should fall back to all18 when front9 slope is null", () => {
			const teeData = createFront9TeeData({
				slopeAndRating: {
					all18: { rating: 71.5, slope: 127 },
					front9: { rating: null, slope: null },
					back9: { rating: 35.6, slope: 125 },
				},
			})
			// Falls back to all18: index=6.7, slope=127, rating=71.5, par=36, 9-hole
			// (6.7/2) x (127/113) + (71.5 - 36) = 3.35 x 1.124 + 35.5 = 39.27 ≈ 39
			const result = calculateHandicapFromTeeData("6.7", teeData)
			expect(result).not.toBeNull()
			expect(result!.courseHandicap).toBe(39)
		})

		it("should return null when fallback all18 also unavailable", () => {
			const teeData = createFront9TeeData({
				slopeAndRating: {
					all18: { rating: null, slope: null },
					front9: { rating: null, slope: null },
					back9: { rating: 35.6, slope: 125 },
				},
			})
			expect(calculateHandicapFromTeeData("6.7", teeData)).toBeNull()
		})
	})

	describe("plus handicaps", () => {
		it("should handle plus handicap (negative course handicap)", () => {
			const teeData = createFront9TeeData()
			// index=+2 (-2), slope=127, rating=35.9, par=36, 9-hole
			// (-2/2) x (127/113) + (35.9 - 36) = -1 x 1.124 - 0.1 = -1.22 ≈ -1
			const result = calculateHandicapFromTeeData("+2", teeData)

			expect(result).not.toBeNull()
			expect(result!.courseHandicap).toBe(-1)
			// -1 stroke to hardest hole (SI 1 = position 0)
			expect(result!.handicapDotsByHole).toEqual([
				-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
			])
		})
	})
})
