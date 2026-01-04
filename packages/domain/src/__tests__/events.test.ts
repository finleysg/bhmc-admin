import {
	eventUrl,
	slugify,
	paymentsAreOpen,
	registrationIsOpen,
	priorityRegistrationIsOpen,
} from "../functions/events"
import {
	AgeRestrictionTypeChoices,
	EventStatusChoices,
	EventTypeChoices,
	RegistrationTypeChoices,
} from "../types"
import type { ClubEvent } from "../types"

const createEvent = (overrides: Partial<ClubEvent> = {}): ClubEvent => ({
	id: 1,
	eventType: EventTypeChoices.WEEKNIGHT,
	name: "Test Event",
	registrationType: RegistrationTypeChoices.MEMBER,
	canChoose: true,
	ghinRequired: false,
	startDate: "2025-07-15",
	status: EventStatusChoices.SCHEDULED,
	season: 2025,
	starterTimeInterval: 10,
	teamSize: 4,
	ageRestrictionType: AgeRestrictionTypeChoices.NONE,
	...overrides,
})

describe("slugify", () => {
	it("converts to lowercase", () => {
		expect(slugify("Hello World")).toBe("hello-world")
	})

	it("replaces spaces with hyphens", () => {
		expect(slugify("hello world test")).toBe("hello-world-test")
	})

	it("removes special characters", () => {
		expect(slugify("hello! world@")).toBe("hello-world")
	})

	it("replaces slashes with spaces then hyphens", () => {
		expect(slugify("Spring/Summer Event")).toBe("spring-summer-event")
	})

	it("collapses multiple hyphens", () => {
		expect(slugify("hello   world")).toBe("hello-world")
	})

	it("trims whitespace", () => {
		expect(slugify("  hello world  ")).toBe("hello-world")
	})

	it("returns empty string for empty input", () => {
		expect(slugify("")).toBe("")
	})

	it("returns empty string for falsy input", () => {
		expect(slugify(null as unknown as string)).toBe("")
		expect(slugify(undefined as unknown as string)).toBe("")
	})
})

describe("eventUrl", () => {
	it("generates correct URL with date and slug", () => {
		// Use ISO format with time to avoid timezone issues
		const event = createEvent({ startDate: "2025-07-15T12:00:00", name: "Summer Classic" })
		expect(eventUrl(event)).toBe("/event/2025-07-15/summer-classic")
	})

	it("handles special characters in name", () => {
		const event = createEvent({ startDate: "2025-07-15T12:00:00", name: "Spring/Summer Event!" })
		expect(eventUrl(event)).toBe("/event/2025-07-15/spring-summer-event")
	})

	it("handles invalid date", () => {
		const event = createEvent({ startDate: "invalid-date", name: "Test" })
		expect(eventUrl(event)).toBe("/event/--/test")
	})

	it("handles empty date", () => {
		const event = createEvent({ startDate: "", name: "Test" })
		expect(eventUrl(event)).toBe("/event/--/test")
	})
})

describe("paymentsAreOpen", () => {
	it("returns false when registration type is NONE", () => {
		const event = createEvent({
			registrationType: RegistrationTypeChoices.NONE,
			signupStart: "2025-07-01T00:00:00",
			paymentsEnd: "2025-07-20T00:00:00",
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(paymentsAreOpen(event, now)).toBe(false)
	})

	it("returns false when signupStart is missing", () => {
		const event = createEvent({
			signupStart: null,
			paymentsEnd: "2025-07-20T00:00:00",
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(paymentsAreOpen(event, now)).toBe(false)
	})

	it("returns false when paymentsEnd is missing", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			paymentsEnd: null,
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(paymentsAreOpen(event, now)).toBe(false)
	})

	it("returns true when within payment window", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			paymentsEnd: "2025-07-20T23:59:59",
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(paymentsAreOpen(event, now)).toBe(true)
	})

	it("returns false before payment window starts", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			paymentsEnd: "2025-07-20T23:59:59",
		})
		const now = new Date("2025-06-30T12:00:00")
		expect(paymentsAreOpen(event, now)).toBe(false)
	})

	it("returns false after payment window ends", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			paymentsEnd: "2025-07-20T23:59:59",
		})
		const now = new Date("2025-07-21T12:00:00")
		expect(paymentsAreOpen(event, now)).toBe(false)
	})

	it("uses prioritySignupStart when available", () => {
		const event = createEvent({
			prioritySignupStart: "2025-06-25T00:00:00",
			signupStart: "2025-07-01T00:00:00",
			paymentsEnd: "2025-07-20T23:59:59",
		})
		// During priority period, before regular signup
		const now = new Date("2025-06-27T12:00:00")
		expect(paymentsAreOpen(event, now)).toBe(true)
	})
})

describe("registrationIsOpen", () => {
	it("returns false when registration type is NONE", () => {
		const event = createEvent({
			registrationType: RegistrationTypeChoices.NONE,
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(registrationIsOpen(event, now)).toBe(false)
	})

	it("returns false when signupStart is missing", () => {
		const event = createEvent({
			signupStart: null,
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(registrationIsOpen(event, now)).toBe(false)
	})

	it("returns false when signupEnd is missing", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			signupEnd: null,
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(registrationIsOpen(event, now)).toBe(false)
	})

	it("returns true when within registration window", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T23:59:59",
		})
		const now = new Date("2025-07-10T12:00:00")
		expect(registrationIsOpen(event, now)).toBe(true)
	})

	it("returns false before registration window", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T23:59:59",
		})
		const now = new Date("2025-06-30T12:00:00")
		expect(registrationIsOpen(event, now)).toBe(false)
	})

	it("returns false after registration window", () => {
		const event = createEvent({
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T23:59:59",
		})
		const now = new Date("2025-07-16T12:00:00")
		expect(registrationIsOpen(event, now)).toBe(false)
	})
})

describe("priorityRegistrationIsOpen", () => {
	it("returns false when registration type is NONE", () => {
		const event = createEvent({
			registrationType: RegistrationTypeChoices.NONE,
			prioritySignupStart: "2025-06-25T00:00:00",
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-06-27T12:00:00")
		expect(priorityRegistrationIsOpen(event, now)).toBe(false)
	})

	it("returns false when prioritySignupStart is missing", () => {
		const event = createEvent({
			prioritySignupStart: null,
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-06-27T12:00:00")
		expect(priorityRegistrationIsOpen(event, now)).toBe(false)
	})

	it("returns false when signupStart is missing", () => {
		const event = createEvent({
			prioritySignupStart: "2025-06-25T00:00:00",
			signupStart: null,
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-06-27T12:00:00")
		expect(priorityRegistrationIsOpen(event, now)).toBe(false)
	})

	it("returns false when signupEnd is missing", () => {
		const event = createEvent({
			prioritySignupStart: "2025-06-25T00:00:00",
			signupStart: "2025-07-01T00:00:00",
			signupEnd: null,
		})
		const now = new Date("2025-06-27T12:00:00")
		expect(priorityRegistrationIsOpen(event, now)).toBe(false)
	})

	it("returns true during priority window", () => {
		const event = createEvent({
			prioritySignupStart: "2025-06-25T00:00:00",
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-06-27T12:00:00")
		expect(priorityRegistrationIsOpen(event, now)).toBe(true)
	})

	it("returns false before priority window", () => {
		const event = createEvent({
			prioritySignupStart: "2025-06-25T00:00:00",
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-06-24T12:00:00")
		expect(priorityRegistrationIsOpen(event, now)).toBe(false)
	})

	it("returns false after priority window (during regular signup)", () => {
		const event = createEvent({
			prioritySignupStart: "2025-06-25T00:00:00",
			signupStart: "2025-07-01T00:00:00",
			signupEnd: "2025-07-15T00:00:00",
		})
		const now = new Date("2025-07-05T12:00:00")
		expect(priorityRegistrationIsOpen(event, now)).toBe(false)
	})
})
