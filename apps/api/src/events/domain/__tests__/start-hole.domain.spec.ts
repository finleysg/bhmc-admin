import { calculateStartingHole } from "../start-hole.domain"
import { HoleDomainData, RegistrationSlotDomainData } from "../types"

describe("start-hole.domain", () => {
	it('returns "8B" for hole with holeNumber=8 and startingOrder=1', () => {
		const holes: HoleDomainData[] = [{ id: 10, holeNumber: 8, courseId: 1 }]
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 1, holeId: 10 }
		expect(calculateStartingHole(slot as RegistrationSlotDomainData, holes)).toBe("8B")
	})

	it('returns "1A" for hole with holeNumber=1 and startingOrder=0', () => {
		const holes: HoleDomainData[] = [{ id: 5, holeNumber: 1, courseId: 1 }]
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0, holeId: 5 }
		expect(calculateStartingHole(slot as RegistrationSlotDomainData, holes)).toBe("1A")
	})

	it("throws when holeId is missing", () => {
		const holes: HoleDomainData[] = [{ id: 1, holeNumber: 1, courseId: 1 }]
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0, holeId: null }
		expect(() => calculateStartingHole(slot as RegistrationSlotDomainData, holes)).toThrow()
	})

	it("throws when hole is not found in provided holes array", () => {
		const holes: HoleDomainData[] = [{ id: 1, holeNumber: 1, courseId: 1 }]
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 0, holeId: 999 }
		expect(() => calculateStartingHole(slot as RegistrationSlotDomainData, holes)).toThrow()
	})

	it("throws on invalid startingOrder values", () => {
		const holes: HoleDomainData[] = [{ id: 2, holeNumber: 3, courseId: 1 }]
		const slot: Partial<RegistrationSlotDomainData> = { slot: 0, startingOrder: 2, holeId: 2 }
		expect(() => calculateStartingHole(slot as RegistrationSlotDomainData, holes)).toThrow()
	})
})
