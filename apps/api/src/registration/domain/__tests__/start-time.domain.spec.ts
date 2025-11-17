import { calculateTeeTime } from "../../../registration/domain/start-time.domain"
import { EventDomainData, RegistrationSlotDomainData } from "../types"

describe("start-time.domain", () => {
	it("returns base time for slot 0 with single split", () => {
		const event: Partial<EventDomainData> = {
			eventType: "N",
			startType: "TT",
			startTime: "5:00 PM",
			teeTimeSplits: "9",
			starterTimeInterval: 0,
		}
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0 }
		expect(calculateTeeTime(event as EventDomainData, slot as RegistrationSlotDomainData)).toBe(
			"5:00 PM",
		)
	})

	it("advances by single split for slot 1", () => {
		const event: Partial<EventDomainData> = {
			eventType: "N",
			startType: "TT",
			startTime: "5:00 PM",
			teeTimeSplits: "9",
			starterTimeInterval: 0,
		}
		const slot: Partial<RegistrationSlotDomainData> = { slot: 1, startingOrder: 1 }
		expect(calculateTeeTime(event as EventDomainData, slot as RegistrationSlotDomainData)).toBe(
			"5:09 PM",
		)
	})

	it("handles alternating splits like '8,9'", () => {
		const event: Partial<EventDomainData> = {
			eventType: "N",
			startType: "TT",
			startTime: "5:00 PM",
			teeTimeSplits: "8,9",
			starterTimeInterval: 0,
		}
		const slot0: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0 }
		const slot1: Partial<RegistrationSlotDomainData> = { slot: 1, startingOrder: 1 }
		const slot2: Partial<RegistrationSlotDomainData> = { slot: 2, startingOrder: 2 }
		expect(calculateTeeTime(event as EventDomainData, slot0 as RegistrationSlotDomainData)).toBe(
			"5:00 PM",
		)
		expect(calculateTeeTime(event as EventDomainData, slot1 as RegistrationSlotDomainData)).toBe(
			"5:08 PM",
		)
		// slot2 offset = 8 + 9 = 17 minutes -> 5:17 PM
		expect(calculateTeeTime(event as EventDomainData, slot2 as RegistrationSlotDomainData)).toBe(
			"5:17 PM",
		)
	})

	it("respects starterTimeInterval (every Nth filled tee time is skipped)", () => {
		const event: Partial<EventDomainData> = {
			eventType: "N",
			startType: "TT",
			startTime: "5:00 PM",
			teeTimeSplits: "9",
			starterTimeInterval: 4,
		}
		// slot 3 -> teeIndex = 3 + floor(3/4) = 3 -> offset 27 -> 5:27 PM
		expect(
			calculateTeeTime(
				event as EventDomainData,
				{ slot: 3, startingOrder: 3 } as RegistrationSlotDomainData,
			),
		).toBe("5:27 PM")
		// slot 4 -> teeIndex = 4 + floor(4/4) = 5 -> offset 45 -> 5:45 PM
		expect(
			calculateTeeTime(
				event as EventDomainData,
				{ slot: 4, startingOrder: 4 } as RegistrationSlotDomainData,
			),
		).toBe("5:45 PM")
	})

	it("throws when required event.startTime is missing", () => {
		const event: Partial<EventDomainData> = {
			eventType: "N",
			startType: "TT",
			startTime: null,
			teeTimeSplits: "9",
			starterTimeInterval: 0,
		}
		expect(() =>
			calculateTeeTime(
				event as EventDomainData,
				{ slot: 0, startingOrder: 0 } as RegistrationSlotDomainData,
			),
		).toThrow()
	})
})
