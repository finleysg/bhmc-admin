import { revalidatePath } from "next/cache"

import { updateSetting } from "../actions"

jest.mock("next/headers", () => ({
	cookies: () => Promise.resolve({ get: () => ({ value: "token-123" }) }),
}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("next/navigation", () => ({
	redirect: jest.fn((url: string) => {
		throw new Error(`redirect:${url}`)
	}),
	notFound: jest.fn(),
}))

const respond = (status: number, body: unknown) =>
	Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

const form = (value: string) => {
	const data = new FormData()
	data.set("value", value)
	return data
}

const idle = { status: "idle" } as const

describe("updateSetting", () => {
	let fetchMock: jest.Mock

	beforeEach(() => {
		process.env.API_URL = "http://api.test"
		fetchMock = jest.fn()
		global.fetch = fetchMock
		jest.mocked(revalidatePath).mockClear()
	})

	it("sends the value as a number and revalidates the page", async () => {
		fetchMock.mockReturnValueOnce(respond(200, {}))

		const result = await updateSetting("readiness.alertLeadDays", idle, form(" 10 "))

		expect(result).toEqual({ status: "success", message: "Setting saved" })
		expect(fetchMock).toHaveBeenCalledWith(
			"http://api.test/settings/readiness.alertLeadDays",
			expect.objectContaining({ method: "PUT", body: JSON.stringify({ value: 10 }) }),
		)
		expect(revalidatePath).toHaveBeenCalledWith("/club/settings")
	})

	it.each([
		["blank", "  ", "Enter a value"],
		["not a number", "ten", "Enter a whole number"],
		["fractional", "7.5", "Enter a whole number"],
	])("rejects a %s value without calling the API", async (_, value, message) => {
		const result = await updateSetting("readiness.alertLeadDays", idle, form(value))

		expect(result).toEqual({ status: "error", message })
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("returns the API's message when it rejects the value", async () => {
		fetchMock.mockReturnValueOnce(
			respond(400, { message: "Readiness alert lead time must be between 1 and 60" }),
		)

		const result = await updateSetting("readiness.alertLeadDays", idle, form("90"))

		expect(result).toEqual({
			status: "error",
			message: "Readiness alert lead time must be between 1 and 60",
		})
		expect(revalidatePath).not.toHaveBeenCalled()
	})
})
