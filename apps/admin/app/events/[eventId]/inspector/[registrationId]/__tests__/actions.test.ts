import { revalidatePath } from "next/cache"

import { addFee, removeFee, setSlotStatus } from "../actions"

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

describe("inspector actions", () => {
	let fetchMock: jest.Mock

	beforeEach(() => {
		fetchMock = jest.fn()
		global.fetch = fetchMock
		jest.mocked(revalidatePath).mockClear()
	})

	const call = (n = 0) => fetchMock.mock.calls[n] as [string, RequestInit]

	it("sets a slot's status and refreshes the registration", async () => {
		fetchMock.mockReturnValue(respond(204))

		const result = await setSlotStatus(51, 7, 300, "A")

		expect(call()[0]).toMatch(/\/registration-inspector\/events\/7\/slots\/300\/status$/)
		expect(call()[1]).toMatchObject({ method: "PUT", body: JSON.stringify({ status: "A" }) })
		expect(result).toEqual({ status: "success", message: "Slot set to Available" })
		expect(revalidatePath).toHaveBeenCalledWith("/events/7/inspector/51")
	})

	it("reports the API's refusal", async () => {
		fetchMock.mockReturnValue(respond(409, { message: "The slot has paid fees." }))

		const result = await setSlotStatus(51, 7, 300, "U")

		expect(result).toEqual({ status: "error", message: "The slot has paid fees." })
		expect(revalidatePath).not.toHaveBeenCalled()
	})

	it("adds a fee", async () => {
		fetchMock.mockReturnValue(respond(204))

		const result = await addFee(
			51,
			7,
			300,
			{ status: "idle" },
			form({ eventFeeId: "12", paidBy: " Cash " }),
		)

		expect(call()[0]).toMatch(/\/registration-inspector\/events\/7\/slots\/300\/fees$/)
		expect(call()[1]).toMatchObject({
			method: "POST",
			body: JSON.stringify({ eventFeeId: 12, waived: false, paidBy: "Cash" }),
		})
		expect(result.status).toBe("success")
	})

	it("waives a fee without asking how it was paid", async () => {
		fetchMock.mockReturnValue(respond(204))

		const result = await addFee(
			51,
			7,
			300,
			{ status: "idle" },
			form({ eventFeeId: "12", waived: "on", paidBy: "" }),
		)

		expect(call()[1]).toMatchObject({ body: JSON.stringify({ eventFeeId: 12, waived: true }) })
		expect(result).toEqual({ status: "success", message: "Fee waived" })
	})

	it("requires a fee and how it was paid", async () => {
		const result = await addFee(
			51,
			7,
			300,
			{ status: "idle" },
			form({ eventFeeId: "", paidBy: "" }),
		)

		expect(result.fieldErrors).toEqual({
			eventFeeId: "Choose a fee",
			paidBy: "Say how it was paid",
		})
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("removes a fee, refunding it when asked", async () => {
		fetchMock.mockReturnValue(respond(204))

		await removeFee(51, 7, 900, false)
		const refunded = await removeFee(51, 7, 900, true)

		expect(call(0)[0]).toMatch(/\/registration-inspector\/events\/7\/fees\/900$/)
		expect(call(1)[0]).toMatch(/\/registration-inspector\/events\/7\/fees\/900\?refund=true$/)
		expect(call(1)[1]).toMatchObject({ method: "DELETE" })
		expect(refunded.message).toBe("Fee refunded and removed")
	})
})
