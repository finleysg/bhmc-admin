import { getGroup } from "../../../registration/domain/group.domain"
import { EventDomainData, RegistrationSlotDomainData } from "../types"

describe("group.domain getGroup", () => {
	it("returns CourseName-StartTime for N + TT", () => {
		const event: Partial<EventDomainData> = { eventType: "N", startType: "TT" }
		const slot: Partial<RegistrationSlotDomainData> = {
			id: 1,
			slot: 0,
			registrationId: 5,
			courseId: 3,
		}
		const startValue = "5:00 PM"
		const courseName = "Pebble"
		expect(
			getGroup(
				event as EventDomainData,
				slot as RegistrationSlotDomainData,
				startValue,
				courseName,
				[],
			),
		).toBe("Pebble-5:00 PM")
	})

	it("returns CourseName-StartingHole for N + SG", () => {
		const event: Partial<EventDomainData> = { eventType: "N", startType: "SG" }
		const slot: Partial<RegistrationSlotDomainData> = {
			id: 2,
			slot: 0,
			registrationId: 6,
			courseId: 4,
		}
		const startValue = "8B"
		const courseName = "Pebble"
		expect(
			getGroup(
				event as EventDomainData,
				slot as RegistrationSlotDomainData,
				startValue,
				courseName,
				[],
			),
		).toBe("Pebble-8B")
	})

	it("returns registration id for W events", () => {
		const event: Partial<EventDomainData> = { eventType: "W", teamSize: 2 }
		const slot: Partial<RegistrationSlotDomainData> = { id: 3, slot: 0, registrationId: 7 }
		expect(getGroup(event as EventDomainData, slot as RegistrationSlotDomainData, "", "", [])).toBe(
			"7",
		)
	})

	it("splits 4-player registration into two teams (a/b) when teamSize=2", () => {
		const event: Partial<EventDomainData> = { eventType: "W", teamSize: 2 }
		const slot1: Partial<RegistrationSlotDomainData> = { id: 11, slot: 0, registrationId: 9 }
		const slot2: Partial<RegistrationSlotDomainData> = { id: 12, slot: 1, registrationId: 9 }
		const slot3: Partial<RegistrationSlotDomainData> = { id: 13, slot: 2, registrationId: 9 }
		const slot4: Partial<RegistrationSlotDomainData> = { id: 14, slot: 3, registrationId: 9 }
		const all = [
			slot1 as RegistrationSlotDomainData,
			slot2 as RegistrationSlotDomainData,
			slot3 as RegistrationSlotDomainData,
			slot4 as RegistrationSlotDomainData,
		]
		expect(
			getGroup(event as EventDomainData, slot1 as RegistrationSlotDomainData, "", "", all),
		).toBe("9a")
		expect(
			getGroup(event as EventDomainData, slot2 as RegistrationSlotDomainData, "", "", all),
		).toBe("9a")
		expect(
			getGroup(event as EventDomainData, slot3 as RegistrationSlotDomainData, "", "", all),
		).toBe("9b")
		expect(
			getGroup(event as EventDomainData, slot4 as RegistrationSlotDomainData, "", "", all),
		).toBe("9b")
	})

	it("returns registration id when teamSize=2 but only 2 players signed up", () => {
		const event: Partial<EventDomainData> = { eventType: "W", teamSize: 2 }
		const slot1: Partial<RegistrationSlotDomainData> = { id: 21, slot: 0, registrationId: 10 }
		const slot2: Partial<RegistrationSlotDomainData> = { id: 22, slot: 1, registrationId: 10 }
		const all = [slot1 as RegistrationSlotDomainData, slot2 as RegistrationSlotDomainData]
		expect(
			getGroup(event as EventDomainData, slot1 as RegistrationSlotDomainData, "", "", all),
		).toBe("10")
		expect(
			getGroup(event as EventDomainData, slot2 as RegistrationSlotDomainData, "", "", all),
		).toBe("10")
	})
})
