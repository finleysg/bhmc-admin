import { getStart } from "../../../registration/domain/event.domain"
import { EventDomainData, HoleDomainData, RegistrationSlotDomainData } from "../types"

describe("event.domain getStart", () => {
	it('returns "N/A" when eventType !== "N"', () => {
		const event: Partial<EventDomainData> = { eventType: "X", startType: "TT" }
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0, holeId: null }
		expect(getStart(event as EventDomainData, slot as RegistrationSlotDomainData, [])).toBe("N/A")
	})

	it("returns tee time for TT start", () => {
		const event: Partial<EventDomainData> = {
			eventType: "N",
			startType: "TT",
			startTime: "5:00 PM",
			teeTimeSplits: "9",
			starterTimeInterval: 0,
			canChoose: 1,
		}
		const slot: Partial<RegistrationSlotDomainData> = { slot: 2, startingOrder: 2, holeId: null }
		// slot 2 offset = 9 + 9 = 18 -> 5:18 PM
		expect(getStart(event as EventDomainData, slot as RegistrationSlotDomainData, [])).toBe(
			"5:18 PM",
		)
	})

	it("returns hole+order for SG start", () => {
		const holes: HoleDomainData[] = [{ id: 11, holeNumber: 8, courseId: 1 }]
		const event: Partial<EventDomainData> = { eventType: "N", startType: "SG", canChoose: 1 }
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 1, holeId: 11 }
		expect(getStart(event as EventDomainData, slot as RegistrationSlotDomainData, holes)).toBe("8B")
	})

	it("throws if SG missing holeId", () => {
		const holes: HoleDomainData[] = [{ id: 1, holeNumber: 1, courseId: 1 }]
		const event: Partial<EventDomainData> = { eventType: "N", startType: "SG", canChoose: 1 }
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0, holeId: null }
		expect(() =>
			getStart(event as EventDomainData, slot as RegistrationSlotDomainData, holes),
		).toThrow()
	})

	it("throws if TT missing required fields", () => {
		const event: Partial<EventDomainData> = {
			eventType: "N",
			startType: "TT",
			startTime: null,
			teeTimeSplits: null,
			starterTimeInterval: 0,
			canChoose: 1,
		}
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0, holeId: null }
		expect(() =>
			getStart(event as EventDomainData, slot as RegistrationSlotDomainData, []),
		).toThrow()
	})
})
