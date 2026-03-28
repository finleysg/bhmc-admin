/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiClient } from "../api-client"
import { ApiError } from "../errors"

describe("ApiClient - domain helpers", () => {
	const makeConfig = (overrides?: Record<string, unknown>) => {
		return {
			get: jest.fn((key: string) => {
				if (overrides && key in overrides) return overrides[key]
				if (key === "golfGenius.apiKey") return "FAKE_KEY"
				if (key === "golfGenius.baseUrl") return "https://example.com"
				if (key === "golfGenius.timeout") return 30000
				if (key === "golfGenius.categoryId") return "4788194574457686575"
				if (key === "golfGenius.lookback") return 0
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
		const season2025 = { id: "season-2025", name: "2025", current: false }

		it("throws when no events on date", async () => {
			jest.spyOn(svc, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([] as any)
			await expect(svc.findMatchingEventByStartDate("2025-01-01")).rejects.toThrow(ApiError)
		})

		it("returns the single matching event by date", async () => {
			const ev = { id: "e1", start_date: "2025-06-10", name: "Summer Classic" }
			jest.spyOn(svc, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev] as any)
			const res = await svc.findMatchingEventByStartDate("2025-06-10")
			expect(res).toEqual(ev)
		})

		it("prefers exact name match when multiple events same date", async () => {
			const ev1 = { id: "a", start_date: "2025-07-01", name: "City Open" }
			const ev2 = { id: "b", start_date: "2025-07-01", name: "City Charity" }
			jest.spyOn(svc, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev1, ev2] as any)
			const res = await svc.findMatchingEventByStartDate("2025-07-01", "City Charity")
			expect(res).toEqual(ev2)
		})

		it("picks best fuzzy match when confident", async () => {
			const ev1 = { id: "a", start_date: "2025-08-01", name: "Annual Championship" }
			const ev2 = { id: "b", start_date: "2025-08-01", name: "Championship Points" }
			jest.spyOn(svc, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev1, ev2] as any)
			const res = await svc.findMatchingEventByStartDate("2025-08-01", "Championship")
			expect(res).toBeDefined()
			expect([ev1.id, ev2.id]).toContain(res.id)
		})

		it("throws when fuzzy matching is not confident", async () => {
			const ev1 = { id: "a", startDate: "2025-09-01", name: "Alpha" }
			const ev2 = { id: "b", startDate: "2025-09-01", name: "Beta" }
			jest.spyOn(svc, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev1, ev2] as any)
			await expect(svc.findMatchingEventByStartDate("2025-09-01", "Gamma")).rejects.toThrow(
				ApiError,
			)
		})

		it("extracts year from startDate to find correct season", async () => {
			const season2024 = { id: "season-2024", name: "2024", current: false }
			const ev = { id: "e1", start_date: "2024-05-07", name: "Past Event" }
			const spy = jest.spyOn(svc, "getSeasonForYear").mockResolvedValueOnce(season2024 as any)
			jest.spyOn(svc, "getEvents").mockResolvedValueOnce([ev] as any)
			const res = await svc.findMatchingEventByStartDate("2024-05-07")
			expect(spy).toHaveBeenCalledWith("2024")
			expect(res).toEqual(ev)
		})

		it("does not retry when lookback is 0 (default)", async () => {
			jest.spyOn(svc, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
			jest
				.spyOn(svc, "getEvents")
				.mockResolvedValueOnce([{ id: "e1", start_date: "2025-01-02", name: "Day After" }] as any)
			await expect(svc.findMatchingEventByStartDate("2025-01-01")).rejects.toThrow(ApiError)
		})

		describe("with positive lookback (backward search)", () => {
			let svcLookback: ApiClient

			beforeEach(() => {
				svcLookback = new ApiClient(makeConfig({ "golfGenius.lookback": 3 }))
			})

			it("finds event on a prior day within lookback range", async () => {
				const ev = { id: "e1", start_date: "2025-06-09", name: "Day Before" }
				jest.spyOn(svcLookback, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
				jest.spyOn(svcLookback, "getEvents").mockResolvedValueOnce([ev] as any)
				const res = await svcLookback.findMatchingEventByStartDate("2025-06-10")
				expect(res).toEqual(ev)
			})

			it("prefers smallest shift", async () => {
				const ev1 = { id: "e1", start_date: "2025-06-09", name: "One Day Back" }
				const ev2 = { id: "e2", start_date: "2025-06-07", name: "Three Days Back" }
				jest.spyOn(svcLookback, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
				jest.spyOn(svcLookback, "getEvents").mockResolvedValueOnce([ev1, ev2] as any)
				const res = await svcLookback.findMatchingEventByStartDate("2025-06-10")
				expect(res).toEqual(ev1)
			})

			it("throws when no events within lookback range", async () => {
				const ev = { id: "e1", start_date: "2025-06-05", name: "Too Far Back" }
				jest.spyOn(svcLookback, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
				jest.spyOn(svcLookback, "getEvents").mockResolvedValueOnce([ev] as any)
				await expect(svcLookback.findMatchingEventByStartDate("2025-06-10")).rejects.toThrow(
					ApiError,
				)
			})
		})

		describe("with negative lookback (forward search)", () => {
			let svcLookahead: ApiClient

			beforeEach(() => {
				svcLookahead = new ApiClient(makeConfig({ "golfGenius.lookback": -3 }))
			})

			it("finds event on a later day within lookahead range", async () => {
				const ev = { id: "e1", start_date: "2025-06-12", name: "Two Days After" }
				jest.spyOn(svcLookahead, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
				jest.spyOn(svcLookahead, "getEvents").mockResolvedValueOnce([ev] as any)
				const res = await svcLookahead.findMatchingEventByStartDate("2025-06-10")
				expect(res).toEqual(ev)
			})

			it("does not search backward when lookback is negative", async () => {
				const ev = { id: "e1", start_date: "2025-06-09", name: "Day Before" }
				jest.spyOn(svcLookahead, "getSeasonForYear").mockResolvedValueOnce(season2025 as any)
				jest.spyOn(svcLookahead, "getEvents").mockResolvedValueOnce([ev] as any)
				await expect(svcLookahead.findMatchingEventByStartDate("2025-06-10")).rejects.toThrow(
					ApiError,
				)
			})
		})
	})
})
