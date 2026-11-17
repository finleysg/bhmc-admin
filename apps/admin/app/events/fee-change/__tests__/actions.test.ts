import { revalidatePath } from "next/cache"

import type { SeasonFeeChange } from "@repo/domain/types"

import { changeSeasonFee, type FeeChangeState } from "../actions"

jest.mock("next/headers", () => ({
	cookies: () => Promise.resolve({ get: () => ({ value: "token-123" }) }),
}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("next/navigation", () => ({ redirect: jest.fn(), notFound: jest.fn() }))

const respond = (status: number, body?: unknown) =>
	Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

const form = (values: Record<string, string>) => {
	const data = new FormData()
	for (const [key, value] of Object.entries(values)) data.append(key, value)
	return data
}

const cartForm = (overrides: Record<string, string> = {}) =>
	form({ feeTypeId: "9", fromAmount: "14", toAmount: "15", eventType: "N", ...overrides })

const previewed: SeasonFeeChange = {
	season: 2027,
	feeTypeId: 9,
	feeTypeName: "Cart Fee",
	fromAmount: 14,
	toAmount: 15,
	eventType: "N",
	applied: false,
	events: [
		{
			eventId: 1,
			eventName: "Individual LG/LN",
			startDate: "2027-03-31",
			eventType: "N",
			changes: [{ kind: "amount", eventFeeId: 5 }],
			refused: null,
		},
	],
}

const idle: FeeChangeState = { status: "idle" }

describe("changeSeasonFee", () => {
	let fetchMock: jest.Mock

	beforeEach(() => {
		fetchMock = jest.fn()
		global.fetch = fetchMock
		jest.mocked(revalidatePath).mockClear()
	})

	const call = (n = 0) => fetchMock.mock.calls[n] as [string, RequestInit]

	it("previews the change", async () => {
		fetchMock.mockReturnValue(respond(200, previewed))

		const state = await changeSeasonFee(2027, idle, cartForm())

		expect(call()[0]).toMatch(/\/seasons\/fee-change\/preview$/)
		expect(JSON.parse(call()[1].body as string)).toEqual({
			season: 2027,
			feeTypeId: 9,
			fromAmount: 14,
			toAmount: 15,
			eventType: "N",
		})
		expect(state).toEqual({ status: "idle", change: previewed })
		expect(revalidatePath).not.toHaveBeenCalled()
	})

	it("sends every event type as null", async () => {
		fetchMock.mockReturnValue(respond(200, previewed))

		await changeSeasonFee(2027, idle, cartForm({ eventType: "none" }))

		expect(JSON.parse(call()[1].body as string)).toMatchObject({ eventType: null })
	})

	it("applies the previewed change", async () => {
		fetchMock.mockReturnValue(respond(200, { ...previewed, applied: true }))
		const data = cartForm()
		data.set("intent", "apply")

		const state = await changeSeasonFee(2027, { status: "idle", change: previewed }, data)

		expect(call()[0]).toMatch(/\/seasons\/fee-change$/)
		expect(state).toMatchObject({ status: "success", message: "Cart Fee changed on 1 event" })
		expect(revalidatePath).toHaveBeenCalledWith("/events", "layout")
	})

	it("refuses to apply values that differ from the preview", async () => {
		const data = cartForm({ toAmount: "16" })
		data.set("intent", "apply")

		const state = await changeSeasonFee(2027, { status: "idle", change: previewed }, data)

		expect(state.status).toBe("error")
		expect(state.message).toMatch(/Preview it again/)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it.each([
		["no fee type", { feeTypeId: "" }, "feeTypeId"],
		["no old amount", { fromAmount: "" }, "fromAmount"],
		["fractions of a cent", { toAmount: "15.005" }, "toAmount"],
		["the same amounts", { toAmount: "14" }, "toAmount"],
	])("shows %s on its field", async (_label, overrides, field) => {
		const state = await changeSeasonFee(2027, idle, cartForm(overrides))
		expect(state.fieldErrors).toHaveProperty(field)
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
