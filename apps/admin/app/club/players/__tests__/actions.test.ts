import { revalidatePath } from "next/cache"

import { setPlayerRoles, updatePlayer } from "../actions"

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

function playerForm(overrides: Record<string, string | null> = {}): FormData {
	const values: Record<string, string | null> = {
		firstName: " Ada ",
		lastName: "Lovelace",
		email: "ada@example.com",
		phoneNumber: "",
		ghin: "1234567",
		tee: "Club",
		birthDate: "",
		isMember: "on",
		...overrides,
	}
	const form = new FormData()
	for (const [key, value] of Object.entries(values)) {
		if (value !== null) form.set(key, value)
	}
	return form
}

const idle = { status: "idle" } as const

describe("player actions", () => {
	let fetchMock: jest.Mock

	beforeEach(() => {
		process.env.API_URL = "http://api.test"
		fetchMock = jest.fn()
		global.fetch = fetchMock
		jest.mocked(revalidatePath).mockClear()
	})

	describe("updatePlayer", () => {
		it("sends trimmed values, with blanks as null, and revalidates", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))

			const result = await updatePlayer(7, idle, playerForm())

			expect(result).toEqual({ status: "success", message: "Player updated" })
			expect(fetchMock).toHaveBeenCalledWith(
				"http://api.test/registration/players/7",
				expect.objectContaining({
					method: "PATCH",
					headers: expect.objectContaining({ Authorization: "Token token-123" }),
				}),
			)
			const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)
			expect(body).toEqual({
				firstName: "Ada",
				lastName: "Lovelace",
				email: "ada@example.com",
				phoneNumber: null,
				ghin: "1234567",
				tee: "Club",
				birthDate: null,
				isMember: true,
			})
			expect(revalidatePath).toHaveBeenCalledWith("/club/players/7")
		})

		it("treats an unchecked member box as not a member", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))

			await updatePlayer(7, idle, playerForm({ isMember: null }))

			const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)
			expect(body).toMatchObject({ isMember: false })
		})

		it("returns field errors without calling the API", async () => {
			const result = await updatePlayer(7, idle, playerForm({ firstName: "  ", email: "nope" }))

			expect(result).toEqual({
				status: "error",
				message: "Please fix the highlighted fields.",
				fieldErrors: { firstName: "First name is required", email: "Enter a valid email" },
			})
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("returns the API's message when the update fails", async () => {
			fetchMock.mockReturnValueOnce(respond(409, { message: "Email already in use" }))

			const result = await updatePlayer(7, idle, playerForm())

			expect(result).toEqual({ status: "error", message: "Email already in use" })
			expect(revalidatePath).not.toHaveBeenCalled()
		})
	})

	describe("setPlayerRoles", () => {
		it("sends the checked roles and revalidates", async () => {
			fetchMock.mockReturnValueOnce(respond(200, { roles: ["club-admin"], isSuperuser: false }))
			const form = new FormData()
			form.append("roles", "club-admin")

			const result = await setPlayerRoles(7, idle, form)

			expect(result).toEqual({ status: "success", message: "Admin roles updated" })
			expect(fetchMock).toHaveBeenCalledWith(
				"http://api.test/players/7/roles",
				expect.objectContaining({ method: "PUT", body: JSON.stringify({ roles: ["club-admin"] }) }),
			)
			expect(revalidatePath).toHaveBeenCalledWith("/club/players/7")
		})

		it("sends an empty list when nothing is checked", async () => {
			fetchMock.mockReturnValueOnce(respond(200, { roles: [], isSuperuser: false }))

			await setPlayerRoles(7, idle, new FormData())

			expect(fetchMock).toHaveBeenCalledWith(
				"http://api.test/players/7/roles",
				expect.objectContaining({ body: JSON.stringify({ roles: [] }) }),
			)
		})

		it("rejects an unknown role without calling the API", async () => {
			const form = new FormData()
			form.append("roles", "super-admin")

			const result = await setPlayerRoles(7, idle, form)

			expect(result.status).toBe("error")
			expect(fetchMock).not.toHaveBeenCalled()
		})
	})
})
