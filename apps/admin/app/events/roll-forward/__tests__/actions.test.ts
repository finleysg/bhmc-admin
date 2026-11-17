import { rollForward } from "../actions"

jest.mock("next/headers", () => ({
	cookies: () => Promise.resolve({ get: () => ({ value: "token-123" }) }),
}))
jest.mock("next/navigation", () => ({
	redirect: jest.fn((url: string) => {
		throw new Error(`redirect:${url}`)
	}),
	notFound: jest.fn(),
}))

const respond = (status: number, body?: unknown) =>
	Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

const form = (values: [string, string][]) => {
	const data = new FormData()
	for (const [key, value] of values) data.append(key, value)
	return data
}

const idle = { status: "idle" } as const

describe("rollForward", () => {
	let fetchMock: jest.Mock

	beforeEach(() => {
		fetchMock = jest.fn()
		global.fetch = fetchMock
	})

	const sent = (call = 0) =>
		JSON.parse((fetchMock.mock.calls[call] as [string, RequestInit])[1].body as string) as unknown

	it("creates the checked events only, then shows the target season", async () => {
		fetchMock.mockReturnValue(respond(201, { created: [] }))

		await expect(
			rollForward(
				2026,
				2027,
				idle,
				form([
					["include", "670"],
					["name-670", " Individual LG/LN "],
					["date-670", "2027-05-05"],
					["name-671", "Dropped"],
					["date-671", "2027-05-12"],
				]),
			),
		).rejects.toThrow("redirect:/events?season=2027")

		expect(fetchMock.mock.calls[0][0]).toMatch(/\/seasons\/roll-forward$/)
		expect(sent()).toEqual({
			fromSeason: 2026,
			toSeason: 2027,
			events: [{ sourceEventId: 670, name: "Individual LG/LN", startDate: "2027-05-05" }],
		})
	})

	it("refuses an empty selection without calling the API", async () => {
		const state = await rollForward(2026, 2027, idle, form([]))
		expect(state).toMatchObject({ status: "error", message: "Choose at least one event" })
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("shows a missing name or date on its row", async () => {
		const state = await rollForward(
			2026,
			2027,
			idle,
			form([
				["include", "670"],
				["name-670", " "],
				["date-670", ""],
			]),
		)
		expect(state.issues).toEqual({ 670: ["Enter a name", "Enter a date"] })
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("shows each event's issues when the API refuses the roll-forward", async () => {
		fetchMock
			.mockReturnValueOnce(respond(409, { message: ["Chicago 19 (2027-06-16): taken"] }))
			.mockReturnValueOnce(
				respond(200, {
					events: [
						{ sourceEventId: 670, issues: [] },
						{ sourceEventId: 687, issues: ["taken"] },
					],
				}),
			)

		const state = await rollForward(
			2026,
			2027,
			idle,
			form([
				["include", "670"],
				["name-670", "Individual LG/LN"],
				["date-670", "2027-05-05"],
				["include", "687"],
				["name-687", "Chicago 19"],
				["date-687", "2027-06-16"],
			]),
		)

		expect(fetchMock.mock.calls[1][0]).toMatch(/\/seasons\/roll-forward\/preview$/)
		expect(sent(1)).toEqual(sent(0))
		expect(state).toMatchObject({ status: "error", issues: { 670: [], 687: ["taken"] } })
	})
})
