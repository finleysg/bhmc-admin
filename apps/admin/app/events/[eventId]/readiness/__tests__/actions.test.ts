import { revalidatePath } from "next/cache"

import { dismissWarning, restoreWarning } from "../actions"

jest.mock("next/headers", () => ({
	cookies: () => Promise.resolve({ get: () => ({ value: "token-123" }) }),
}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("next/navigation", () => ({ redirect: jest.fn(), notFound: jest.fn() }))

const respond = (status: number, body?: unknown) =>
	Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

describe("readiness actions", () => {
	const fetchMock = jest.fn()

	beforeEach(() => {
		process.env.API_URL = "http://api"
		global.fetch = fetchMock
		fetchMock.mockReset()
		jest.mocked(revalidatePath).mockReset()
	})

	it("dismisses a warning and refreshes the event", async () => {
		fetchMock.mockReturnValueOnce(respond(201, {}))

		const result = await dismissWarning(7, "fee-differs", "3")

		expect(result).toEqual({ status: "success", message: "Warning dismissed" })
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toBe("http://api/events/7/readiness/dismissals")
		expect(init.method).toBe("POST")
		expect(JSON.parse(init.body as string)).toEqual({ code: "fee-differs", subject: "3" })
		expect(revalidatePath).toHaveBeenCalledWith("/events/7", "layout")
	})

	it("restores a warning", async () => {
		fetchMock.mockReturnValueOnce(respond(200, {}))

		const result = await restoreWarning(7, "schedule-differs", "startTime")

		expect(result.status).toBe("success")
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toBe(
			"http://api/events/7/readiness/dismissals?code=schedule-differs&subject=startTime",
		)
		expect(init.method).toBe("DELETE")
	})

	it("returns the API's message on failure", async () => {
		fetchMock.mockReturnValueOnce(
			respond(400, { message: "Only a current warning can be dismissed" }),
		)

		expect(await dismissWarning(7, "no-slots", "")).toEqual({
			status: "error",
			message: "Only a current warning can be dismissed",
		})
		expect(revalidatePath).not.toHaveBeenCalled()
	})
})
