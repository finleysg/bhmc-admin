import { build, sequence } from "@jackfranklin/test-data-bot"

const buildSlot = build("slot", {
	fields: {
		id: sequence((n) => n),
		event: 0,
		hole: 0,
		registration: undefined,
		starting_order: 0,
		slot: 0,
		status: "A",
		player: undefined,
	},
})

export const buildTeetimeSlots = (
	eventId: number,
	holeId: number,
	groups: number,
	groupSize: number,
) => {
	const slots = []
	for (let i = 0; i < groups * groupSize; i++) {
		const slot = buildSlot({
			overrides: {
				event: eventId,
				hole: holeId,
				starting_order: Math.floor(i / groupSize),
				slot: i % groupSize,
			},
		})
		slots.push(slot)
	}
	return slots
}

export const buildShotgunSlots = (
	eventId: number,
	holeId: number,
	groups: number,
	groupSize: number,
) => {
	const slots = []
	for (let i = 0; i < groups * groupSize; i++) {
		const slot = buildSlot({
			overrides: {
				event: eventId,
				hole: holeId + Math.floor(i / (groupSize * 2)),
				starting_order: Math.floor(i / groupSize) % 2,
				slot: i % groupSize,
			},
		})
		slots.push(slot)
	}
	return slots
}
