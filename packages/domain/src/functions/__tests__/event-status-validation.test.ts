import { validateEventStatus, parseEventStartDateTime } from "../event-status-validation"
import {
	ClubEvent,
	EventStatusChoices,
	EventTypeChoices,
	RegistrationTypeChoices,
	AgeRestrictionTypeChoices,
} from "../../types"

describe("parseEventStartDateTime", () => {
	it("should parse event start date and time into Date object", () => {
		const event: ClubEvent = {
			id: 1,
			eventType: EventTypeChoices.WEEKNIGHT,
			name: "Test Event",
			registrationType: RegistrationTypeChoices.OPEN,
			canChoose: false,
			ghinRequired: false,
			startDate: "2025-06-15",
			startTime: "08:30:00",
			status: EventStatusChoices.SCHEDULED,
			season: 2025,
			starterTimeInterval: 10,
			teamSize: 1,
			ageRestrictionType: AgeRestrictionTypeChoices.NONE,
		}

		const result = parseEventStartDateTime(event)
		expect(result).toBeInstanceOf(Date)
		expect(result.toISOString()).toContain("2025-06-15")
	})

	it("should handle missing start time with default 00:00:00", () => {
		const event: ClubEvent = {
			id: 1,
			eventType: EventTypeChoices.WEEKNIGHT,
			name: "Test Event",
			registrationType: RegistrationTypeChoices.OPEN,
			canChoose: false,
			ghinRequired: false,
			startDate: "2025-06-15",
			startTime: null,
			status: EventStatusChoices.SCHEDULED,
			season: 2025,
			starterTimeInterval: 10,
			teamSize: 1,
			ageRestrictionType: AgeRestrictionTypeChoices.NONE,
		}

		const result = parseEventStartDateTime(event)
		expect(result).toBeInstanceOf(Date)
	})
})

describe("validateEventStatus", () => {
	const futureDate = new Date()
	futureDate.setDate(futureDate.getDate() + 30)
	const futureStartDate = futureDate.toISOString().split("T")[0]

	const pastDate = new Date()
	pastDate.setDate(pastDate.getDate() - 30)
	const pastStartDate = pastDate.toISOString().split("T")[0]

	const futureSignupEnd = new Date()
	futureSignupEnd.setDate(futureSignupEnd.getDate() + 15)

	const pastSignupEnd = new Date()
	pastSignupEnd.setDate(pastSignupEnd.getDate() - 5)

	const baseEvent: ClubEvent = {
		id: 1,
		eventType: EventTypeChoices.WEEKNIGHT,
		name: "Test Event",
		registrationType: RegistrationTypeChoices.OPEN,
		canChoose: false,
		ghinRequired: false,
		startDate: futureStartDate,
		startTime: "08:30:00",
		status: EventStatusChoices.SCHEDULED,
		season: 2025,
		starterTimeInterval: 10,
		teamSize: 1,
		ageRestrictionType: AgeRestrictionTypeChoices.NONE,
		registrationMaximum: 100,
		signupEnd: futureSignupEnd.toISOString(),
	}

	it("should return error when slots=0 AND canChoose=true", () => {
		const event = { ...baseEvent, canChoose: true, ggId: "gg123" }
		const results = validateEventStatus(event, 0, false)

		const errorResult = results.find((r) => r.code === "no-slots-can-choose")
		expect(errorResult).toBeDefined()
		expect(errorResult?.type).toBe("error")
		expect(errorResult?.message).toContain("No registration slots available")
		expect(errorResult?.action).toBeDefined()
		expect(errorResult?.action?.label).toBe("Create Slots")
		expect(errorResult?.action?.type).toBe("api-call")
		expect(errorResult?.action?.endpoint).toBe("/api/django/events/1/create-slots")
		expect(errorResult?.action?.method).toBe("POST")
	})

	it("should return error when slots=0 AND canChoose=false AND signup not ended", () => {
		const event = {
			...baseEvent,
			canChoose: false,
			registrationMaximum: 0,
			signupEnd: futureSignupEnd.toISOString(),
			ggId: "gg123",
		}
		const results = validateEventStatus(event, 0, false)

		const errorResult = results.find((r) => r.code === "no-slots-no-choose")
		expect(errorResult).toBeDefined()
		expect(errorResult?.type).toBe("error")
		expect(errorResult?.message).toContain("no registration maximum set")
		expect(errorResult?.action).toBeDefined()
		expect(errorResult?.action?.label).toBe("Edit in Django")
		expect(errorResult?.action?.type).toBe("redirect")
		expect(errorResult?.action?.url).toBe("/admin/events/event/1/change/")
	})

	it("should return info when slots>0 AND canChoose=true AND signup not ended", () => {
		const event = {
			...baseEvent,
			canChoose: true,
			signupEnd: futureSignupEnd.toISOString(),
		}
		const results = validateEventStatus(event, 10, false)

		const infoResult = results.find((r) => r.code === "can-add-teetime")
		expect(infoResult).toBeDefined()
		expect(infoResult?.type).toBe("info")
		expect(infoResult?.message).toContain("add a tee time document")
		expect(infoResult?.action?.label).toBe("Add Tee Time")
		expect(infoResult?.action?.type).toBe("api-call")
		expect(infoResult?.action?.endpoint).toBe("/api/django/events/1/append-teetime")
		expect(infoResult?.action?.method).toBe("PUT")
	})

	it("should return warning when ggId is missing", () => {
		const event = { ...baseEvent, ggId: null }
		const results = validateEventStatus(event, 10, false)

		const warningResult = results.find((r) => r.code === "missing-gg-id")
		expect(warningResult).toBeDefined()
		expect(warningResult?.type).toBe("warning")
		expect(warningResult?.message).toContain("Golf Genius ID is not configured")
		expect(warningResult?.action?.label).toBe("Configure Golf Genius")
		expect(warningResult?.action?.type).toBe("redirect")
		expect(warningResult?.action?.url).toBe("/events/1/golf-genius")
	})

	it("should return warning when signup ended AND event not started AND no tee time document", () => {
		const event = {
			...baseEvent,
			signupEnd: pastSignupEnd.toISOString(),
		}
		const results = validateEventStatus(event, 10, false)

		const warningResult = results.find((r) => r.code === "no-teetime-document")
		expect(warningResult).toBeDefined()
		expect(warningResult?.type).toBe("warning")
		expect(warningResult?.message).toContain("Signup has ended but no tee time document")
		expect(warningResult?.action).toBeUndefined()
	})

	it("should return empty array when all validations pass", () => {
		const event = {
			...baseEvent,
			canChoose: false,
			ggId: "gg123",
			signupEnd: futureSignupEnd.toISOString(),
		}
		const results = validateEventStatus(event, 10, true)

		expect(results).toHaveLength(0)
	})

	it("should return empty array for past events (readonly)", () => {
		const event = {
			...baseEvent,
			startDate: pastStartDate,
			canChoose: true,
			ggId: null,
		}
		// Even with problems, past events return no validations
		const results = validateEventStatus(event, 0, false)

		expect(results).toHaveLength(0)
	})

	it("should not return signup ended warning when tee time document exists", () => {
		const event = {
			...baseEvent,
			signupEnd: pastSignupEnd.toISOString(),
		}
		const results = validateEventStatus(event, 10, true)

		const warningResult = results.find((r) => r.code === "no-teetime-document")
		expect(warningResult).toBeUndefined()
	})

	it("should not return add-teetime info when signup has ended", () => {
		const event = {
			...baseEvent,
			canChoose: true,
			signupEnd: pastSignupEnd.toISOString(),
		}
		const results = validateEventStatus(event, 10, false)

		const infoResult = results.find((r) => r.code === "can-add-teetime")
		expect(infoResult).toBeUndefined()
	})
})
