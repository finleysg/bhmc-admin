import type { ReserveSlot } from "../registration/reserve-utils"
import { updateSlotSelection } from "../registration/reserve-utils"

function makeReserveSlot(overrides: Partial<ReserveSlot> = {}): ReserveSlot {
	return {
		id: 1,
		groupId: "east-3:00 pm",
		holeId: 10,
		playerId: null,
		playerName: undefined,
		position: 0,
		registrationId: null,
		startingOrder: 0,
		status: "A",
		statusName: "Open",
		selected: false,
		...overrides,
	}
}

describe("updateSlotSelection", () => {
	it("selects a single slot in a group", () => {
		const slot = makeReserveSlot({ id: 1, groupId: "groupA" })
		const result = updateSlotSelection([], [slot])

		expect(result).toEqual([slot])
		expect(slot.selected).toBe(true)
	})

	it("toggles off an already-selected slot", () => {
		const slot = makeReserveSlot({ id: 1, groupId: "groupA", selected: true })
		const result = updateSlotSelection([slot], [slot])

		expect(result).toEqual([])
		expect(slot.selected).toBe(false)
	})

	it("clears selections in other groups when selecting a new group", () => {
		const slotA = makeReserveSlot({ id: 1, groupId: "groupA", selected: true })
		const slotB = makeReserveSlot({ id: 2, groupId: "groupB" })

		const result = updateSlotSelection([slotA], [slotB])

		expect(slotA.selected).toBe(false)
		expect(slotB.selected).toBe(true)
		expect(result).toEqual([slotB])
	})

	it("adds to selection within the same group", () => {
		const slot1 = makeReserveSlot({ id: 1, groupId: "groupA", selected: true })
		const slot2 = makeReserveSlot({ id: 2, groupId: "groupA" })

		const result = updateSlotSelection([slot1], [slot2])

		expect(result).toHaveLength(2)
		expect(result).toContain(slot1)
		expect(result).toContain(slot2)
		expect(slot2.selected).toBe(true)
	})

	it("multi-select clears all previous and selects new set", () => {
		const oldSlot = makeReserveSlot({ id: 1, groupId: "groupA", selected: true })
		const newSlot1 = makeReserveSlot({ id: 3, groupId: "groupB" })
		const newSlot2 = makeReserveSlot({ id: 4, groupId: "groupB" })

		const result = updateSlotSelection([oldSlot], [newSlot1, newSlot2])

		expect(oldSlot.selected).toBe(false)
		expect(newSlot1.selected).toBe(true)
		expect(newSlot2.selected).toBe(true)
		expect(result).toEqual([newSlot1, newSlot2])
	})
})
