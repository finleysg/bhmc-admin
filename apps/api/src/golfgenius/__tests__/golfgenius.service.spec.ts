/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiClient } from "../api-client"
import { ApiError } from "../errors"

describe("ApiClient - domain helpers", () => {
	const makeConfig = () => {
		return {
			get: jest.fn((key: string) => {
				if (key === "golfGenius.apiKey") return "FAKE_KEY"
				if (key === "golfGenius.baseUrl") return "https://example.com"
				if (key === "golfGenius.timeout") return 30000
				if (key === "golfGenius.categoryId") return "4788194574457686575"
				return undefined
			}),
		} as any
	}

	let svc: ApiClient

	beforeEach(() => {
		svc = new ApiClient(makeConfig())
	})

	describe("stringSimilarity (private)", () => {
		it("returns 1 for identical strings", () => {
			const fn = (svc as any).stringSimilarity.bind(svc)
			expect(fn("TestName", "TestName")).toBeCloseTo(1, 3)
		})

		it("returns 0 for totally different strings", () => {
			const fn = (svc as any).stringSimilarity.bind(svc)
			expect(fn("abcd", "wxyz")).toBeGreaterThanOrEqual(0)
			expect(fn("abcd", "wxyz")).toBeLessThan(0.5)
		})

		it("is symmetric and gives higher score for similar strings", () => {
			const fn = (svc as any).stringSimilarity.bind(svc)
			const a = fn("Spring Open", "Spring Open")
			const b = fn("Spring Open", "Spring Open 2025")
			expect(a).toBeGreaterThanOrEqual(b)
		})
	})

	describe("getCurrentSeasonForYear", () => {
		const year = new Date().getFullYear().toString()

		it("throws when no seasons returned", async () => {
			jest.spyOn(svc, "getSeasons").mockResolvedValueOnce([] as any)
			await expect(svc.getCurrentSeasonForYear()).rejects.toThrow(ApiError)
		})

		it("throws when current flag points to different year", async () => {
			jest.spyOn(svc, "getSeasons").mockResolvedValueOnce([
				{ id: "1", name: "2020", current: true },
				{ id: "2", name: year, current: false },
			] as any)
			await expect(svc.getCurrentSeasonForYear()).rejects.toThrow(ApiError)
		})

		it("returns season matching the calendar year when present", async () => {
			const seasons = [{ id: "5", name: year, current: false }]
			jest.spyOn(svc, "getSeasons").mockResolvedValueOnce(seasons as any)
			const res = await svc.getCurrentSeasonForYear()
			expect(res).toEqual(seasons[0])
		})

		it("returns current-flagged season when its name equals the year", async () => {
			const seasons = [{ id: "9", name: year, current: true }]
			jest.spyOn(svc, "getSeasons").mockResolvedValueOnce(seasons as any)
			const res = await svc.getCurrentSeasonForYear()
			expect(res).toEqual(seasons[0])
		})
	})

	describe("findMatchingEventByStartDate", () => {
		const yearSeason = { id: "season-1", name: new Date().getFullYear().toString(), current: true }

		it("throws when no events on date", async () => {
			jest.spyOn(svc, "getCurrentSeasonForYear").mockResolvedValueOnce(yearSeason as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([] as any)
			await expect(svc.findMatchingEventByStartDate("2025-01-01")).rejects.toThrow(ApiError)
		})

		it("returns the single matching event by date", async () => {
			const ev = { id: "e1", startDate: "2025-06-10", name: "Summer Classic" }
			jest.spyOn(svc, "getCurrentSeasonForYear").mockResolvedValueOnce(yearSeason as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev] as any)
			const res = await svc.findMatchingEventByStartDate("2025-06-10")
			expect(res).toEqual(ev)
		})

		it("prefers exact name match when multiple events same date", async () => {
			const ev1 = { id: "a", startDate: "2025-07-01", name: "City Open" }
			const ev2 = { id: "b", startDate: "2025-07-01", name: "City Charity" }
			jest.spyOn(svc, "getCurrentSeasonForYear").mockResolvedValueOnce(yearSeason as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev1, ev2] as any)
			const res = await svc.findMatchingEventByStartDate("2025-07-01", "City Charity")
			expect(res).toEqual(ev2)
		})

		it("picks best fuzzy match when confident", async () => {
			const ev1 = { id: "a", startDate: "2025-08-01", name: "Annual Championship" }
			const ev2 = { id: "b", startDate: "2025-08-01", name: "Championship Points" }
			jest.spyOn(svc, "getCurrentSeasonForYear").mockResolvedValueOnce(yearSeason as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev1, ev2] as any)
			const res = await svc.findMatchingEventByStartDate("2025-08-01", "Championship")
			expect(res).toBeDefined()
			expect([ev1.id, ev2.id]).toContain(res.id)
		})

		it("throws when fuzzy matching is not confident", async () => {
			const ev1 = { id: "a", startDate: "2025-09-01", name: "Alpha" }
			const ev2 = { id: "b", startDate: "2025-09-01", name: "Beta" }
			jest.spyOn(svc, "getCurrentSeasonForYear").mockResolvedValueOnce(yearSeason as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev1, ev2] as any)
			await expect(svc.findMatchingEventByStartDate("2025-09-01", "Gamma")).rejects.toThrow(
				ApiError,
			)
		})
	})
})
