import { revalidatePath } from "next/cache"

import { createEvent, listEventsForCopy, loadEventForCopy } from "../../../new/actions"
import {
	appendTeeTime,
	createSlots,
	deleteEventFee,
	deleteSession,
	deleteSlotGroup,
	saveEventFee,
	saveSession,
	setEventCourses,
	setSlotGroupStatus,
	updateEventSettings,
} from "../actions"

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

const respond = (status: number, body?: unknown) =>
	Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

const form = (values: Record<string, string | string[]>) => {
	const data = new FormData()
	for (const [key, value] of Object.entries(values)) {
		for (const v of [value].flat()) data.append(key, v)
	}
	return data
}

const settingsForm = (overrides: Record<string, string> = {}) =>
	form({
		eventType: "N",
		name: " Weeknight Stroke ",
		rounds: "",
		registrationType: "M",
		skinsType: "none",
		minimumSignupGroupSize: "1",
		maximumSignupGroupSize: "5",
		groupSize: "5",
		totalGroups: "15",
		startType: "TT",
		canChoose: "on",
		seasonPoints: "",
		notes: "",
		startDate: "2027-05-05",
		startTime: "3:00 PM",
		prioritySignupStart: "",
		signupStart: "2027-04-28T09:00",
		signupEnd: "2027-05-04T12:00",
		paymentsEnd: "",
		registrationMaximum: "",
		portalUrl: "",
		externalUrl: "",
		status: "S",
		season: "2027",
		teeTimeSplits: "8",
		starterTimeInterval: "0",
		teamSize: "1",
		signupWaves: "",
		ageRestriction: "",
		ageRestrictionType: "N",
		defaultTagId: "none",
		...overrides,
	})

const idle = { status: "idle" } as const
const sentBody = (fetchMock: jest.Mock) =>
	JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string) as Record<
		string,
		unknown
	>

describe("event workspace actions", () => {
	let fetchMock: jest.Mock

	beforeEach(() => {
		process.env.API_URL = "http://api.test"
		fetchMock = jest.fn()
		global.fetch = fetchMock
		jest.mocked(revalidatePath).mockClear()
	})

	describe("updateEventSettings", () => {
		it("sends typed settings with signup times converted from club time to UTC", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))

			const result = await updateEventSettings(7, idle, settingsForm())

			expect(result).toEqual({ status: "success", message: "Event settings saved" })
			expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/events/7")
			expect(sentBody(fetchMock)).toMatchObject({
				name: "Weeknight Stroke",
				rounds: null,
				skinsType: null,
				groupSize: 5,
				canChoose: true,
				ghinRequired: false,
				signupStart: "2027-04-28T14:00:00.000Z",
				prioritySignupStart: null,
				notes: null,
				defaultTagId: null,
			})
			expect(revalidatePath).toHaveBeenCalledWith("/events/7", "layout")
		})

		it("sends the chosen photo tag", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))
			await updateEventSettings(7, idle, settingsForm({ defaultTagId: "12" }))
			expect(sentBody(fetchMock)).toMatchObject({ defaultTagId: 12 })
		})

		it("reports field errors without calling the API", async () => {
			const result = await updateEventSettings(
				7,
				idle,
				settingsForm({ name: " ", groupSize: "4.5", startDate: "" }),
			)

			expect(result.status).toBe("error")
			expect(result.fieldErrors).toEqual({
				name: "Name is required",
				groupSize: "Enter a whole number",
				startDate: "Enter a date",
			})
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("reports dates out of order on the field without calling the API", async () => {
			const result = await updateEventSettings(
				7,
				idle,
				settingsForm({ signupEnd: "2027-04-27T12:00" }),
			)

			expect(result.status).toBe("error")
			expect(result.fieldErrors).toEqual({
				signupEnd: "Signup start must be earlier than signup end",
			})
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("reports a tee-sheet start time that is not a time", async () => {
			const result = await updateEventSettings(7, idle, settingsForm({ startTime: "2 PM" }))

			expect(result.fieldErrors).toEqual({
				startTime: "Enter a start time like 2:00 PM: players choose tee times, which count from it",
			})
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("returns the API's message for rules between fields", async () => {
			fetchMock.mockReturnValueOnce(
				respond(400, { message: ["groupSize: A group size is required"] }),
			)

			const result = await updateEventSettings(7, idle, settingsForm({ groupSize: "" }))

			expect(result).toEqual({ status: "error", message: "groupSize: A group size is required" })
			expect(revalidatePath).not.toHaveBeenCalled()
		})
	})

	describe("createEvent", () => {
		it("creates the event and opens its workspace", async () => {
			fetchMock.mockReturnValueOnce(respond(201, { id: 42 }))

			await expect(createEvent(idle, settingsForm())).rejects.toThrow("redirect:/events/42/setup")
			expect(fetchMock).toHaveBeenCalledWith(
				"http://api.test/events",
				expect.objectContaining({ method: "POST" }),
			)
			expect(sentBody(fetchMock)).not.toHaveProperty("copyFromEventId")
		})

		it("sends the event to copy courses, fees, and sessions from", async () => {
			fetchMock.mockReturnValueOnce(respond(201, { id: 42 }))
			const data = settingsForm()
			data.set("copyFromEventId", "670")

			await expect(createEvent(idle, data)).rejects.toThrow("redirect:/events/42/setup")
			expect(sentBody(fetchMock)).toMatchObject({ name: "Weeknight Stroke", copyFromEventId: 670 })
		})
	})

	describe("copy-from-event reads", () => {
		it("lists a season's events in date order", async () => {
			fetchMock.mockReturnValueOnce(
				respond(200, [
					{ id: 2, startDate: "2026-05-06" },
					{ id: 1, startDate: "2026-04-01" },
				]),
			)

			const events = await listEventsForCopy(2026)

			expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/events?season=2026")
			expect(events.map((e) => e.id)).toEqual([1, 2])
		})

		it("loads an event's setup, or null when it cannot", async () => {
			fetchMock.mockReturnValueOnce(respond(200, { id: 670 }))
			expect(await loadEventForCopy(670)).toEqual({ id: 670 })
			expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/events/670/setup")

			fetchMock.mockReturnValueOnce(respond(404, { message: "Event 9 not found" }))
			expect(await loadEventForCopy(9)).toBeNull()
		})
	})

	describe("setEventCourses", () => {
		it("sends the checked course ids", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))

			const result = await setEventCourses(7, idle, form({ courseIds: ["3", "5"] }))

			expect(result.status).toBe("success")
			expect(sentBody(fetchMock)).toEqual({ courseIds: [3, 5] })
		})

		it("sends an empty list when no course is checked", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))
			await setEventCourses(7, idle, form({}))
			expect(sentBody(fetchMock)).toEqual({ courseIds: [] })
		})
	})

	describe("saveEventFee", () => {
		const feeForm = (overrides: Record<string, string> = {}) =>
			form({
				feeTypeId: "4",
				amount: "14",
				overrideAmount: "",
				overrideRestriction: "none",
				...overrides,
			})

		it("adds a fee", async () => {
			fetchMock.mockReturnValueOnce(respond(201, {}))

			const result = await saveEventFee(7, null, idle, feeForm())

			expect(result).toEqual({ status: "success", message: "Fee added" })
			expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/events/7/fees")
			expect(sentBody(fetchMock)).toEqual({
				feeTypeId: 4,
				amount: 14,
				isRequired: false,
				overrideAmount: null,
				overrideRestriction: null,
			})
		})

		it("saves an existing fee with its override", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))

			await saveEventFee(
				7,
				9,
				idle,
				feeForm({ isRequired: "on", overrideAmount: "7", overrideRestriction: "Seniors" }),
			)

			expect(fetchMock).toHaveBeenCalledWith(
				"http://api.test/events/7/fees/9",
				expect.objectContaining({ method: "PUT" }),
			)
			expect(sentBody(fetchMock)).toMatchObject({
				isRequired: true,
				overrideAmount: 7,
				overrideRestriction: "Seniors",
			})
		})

		it.each([
			["no fee type", { feeTypeId: "" }, "feeTypeId"],
			["no amount", { amount: "" }, "amount"],
			["an override with no restriction", { overrideAmount: "7" }, "overrideAmount"],
		])("rejects %s", async (_, overrides, field) => {
			const result = await saveEventFee(7, null, idle, feeForm(overrides))

			expect(result.fieldErrors).toHaveProperty(field)
			expect(fetchMock).not.toHaveBeenCalled()
		})
	})

	describe("deleteEventFee", () => {
		it("deletes the fee", async () => {
			fetchMock.mockReturnValueOnce(respond(204))

			const result = await deleteEventFee(7, 9)

			expect(result).toEqual({ status: "success", message: "Fee deleted" })
			expect(revalidatePath).toHaveBeenCalledWith("/events/7", "layout")
		})

		it("returns the API's refusal", async () => {
			fetchMock.mockReturnValueOnce(
				respond(409, { message: "Cannot delete a fee that 2 registration fee record(s) refer to" }),
			)

			const result = await deleteEventFee(7, 9)

			expect(result).toEqual({
				status: "error",
				message: "Cannot delete a fee that 2 registration fee record(s) refer to",
			})
		})
	})

	describe("saveSession", () => {
		const sessionForm = (overrides: Record<string, string> = {}) =>
			form({
				name: " Early ",
				registrationLimit: "40",
				displayOrder: "1",
				"override-3": "12",
				"override-4": " ",
				...overrides,
			})

		it("sends the session with only the overrides that have an amount", async () => {
			fetchMock.mockReturnValueOnce(respond(201, {}))

			const result = await saveSession(7, null, idle, sessionForm())

			expect(result).toEqual({ status: "success", message: "Session added" })
			expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/events/7/sessions")
			expect(sentBody(fetchMock)).toEqual({
				name: "Early",
				registrationLimit: 40,
				displayOrder: 1,
				feeOverrides: [{ eventFeeId: 3, amount: 12 }],
			})
		})

		it("saves an existing session", async () => {
			fetchMock.mockReturnValueOnce(respond(200, {}))
			await saveSession(7, 11, idle, sessionForm())
			expect(fetchMock).toHaveBeenCalledWith(
				"http://api.test/events/7/sessions/11",
				expect.objectContaining({ method: "PUT" }),
			)
		})

		it.each([
			["no name", { name: "" }, "name"],
			["no limit", { registrationLimit: "" }, "registrationLimit"],
			["a negative override", { "override-3": "-1" }, "feeOverrides"],
		])("rejects %s", async (_, overrides, field) => {
			const result = await saveSession(7, null, idle, sessionForm(overrides))
			expect(result.fieldErrors).toHaveProperty(field)
			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("deletes a session and returns the API's refusal", async () => {
			fetchMock.mockReturnValueOnce(respond(409, { message: "Cannot delete session" }))
			expect(await deleteSession(7, 11)).toEqual({
				status: "error",
				message: "Cannot delete session",
			})
		})
	})

	describe("slot actions", () => {
		it.each([
			["createSlots", () => createSlots(7), "http://api.test/events/7/slots", "POST", undefined],
			[
				"appendTeeTime",
				() => appendTeeTime(7),
				"http://api.test/events/7/slots/tee-times",
				"POST",
				undefined,
			],
			[
				"deleteSlotGroup",
				() => deleteSlotGroup(7, 21, 3),
				"http://api.test/events/7/slots/groups/21/3",
				"DELETE",
				undefined,
			],
			[
				"setSlotGroupStatus",
				() => setSlotGroupStatus(7, 21, 3, "U"),
				"http://api.test/events/7/slots/groups/21/3/status",
				"PUT",
				JSON.stringify({ status: "U" }),
			],
		])("%s calls the API and refreshes the workspace", async (_, act, url, method, body) => {
			fetchMock.mockReturnValueOnce(respond(200, []))

			const result = await act()

			expect(result.status).toBe("success")
			expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({ method, body }))
			expect(revalidatePath).toHaveBeenCalledWith("/events/7", "layout")
		})

		it("returns the API's refusal", async () => {
			fetchMock.mockReturnValueOnce(
				respond(409, { message: "Cannot create slots after registration has opened" }),
			)
			expect(await createSlots(7)).toEqual({
				status: "error",
				message: "Cannot create slots after registration has opened",
			})
		})
	})
})
