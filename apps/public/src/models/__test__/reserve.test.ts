import { expect, test } from "vitest"

import { buildTeetimeSlots } from "../../test/data/registration-slots"
import { getTestEvent, TestEventType } from "../../test/data/test-events"
import { ClubEvent, ClubEventApiSchema } from "../club-event"
import { RegistrationSlot, RegistrationSlotApiSchema } from "../registration"
import { LoadReserveTables } from "../reserve"

test("test data is generated correctly", () => {
	const slots = buildTeetimeSlots(1, 1, 5, 5)
	const result = RegistrationSlotApiSchema.safeParse(slots[0])
	if (!result.success) {
		console.error(result.error.message)
	}
	expect(result.success).toBe(true)
})

test("builds teetime tables for weeknight event using default splits", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))
	const slots1 = buildTeetimeSlots(clubEvent.id, 1, 5, 5)
	const slots2 = buildTeetimeSlots(clubEvent.id, 10, 5, 5)
	const slots3 = buildTeetimeSlots(clubEvent.id, 19, 5, 5)
	const eastSlots = slots1
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s1) => new RegistrationSlot(s1))
	const northSlots = slots2
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s2) => new RegistrationSlot(s2))
	const westSlots = slots3
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s3) => new RegistrationSlot(s3))
	clubEvent.totalGroups = 5
	clubEvent.startTime = "2:30 PM"

	const tables = LoadReserveTables(clubEvent, [...eastSlots, ...northSlots, ...westSlots])

	expect(tables.length).toBe(3)
	expect(tables[0].groups.length).toBe(5)
	expect(tables[0].groups[0].slots.length).toBe(5)
	expect(tables[0].groups[0].name).toEqual("2:30 PM")
	expect(tables[0].groups[1].name).toEqual("2:38 PM")
	expect(tables[0].groups[2].name).toEqual("2:46 PM")
	expect(tables[0].groups[3].name).toEqual("2:54 PM")
	expect(tables[0].groups[4].name).toEqual("3:02 PM")
})

test("builds teetime tables based on splits in the event settings", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	const clubEvent = new ClubEvent(
		ClubEventApiSchema.parse({ ...eventData, ...{ tee_time_splits: "10" } }),
	)
	const slots1 = buildTeetimeSlots(clubEvent.id, 1, 5, 5)
	const slots2 = buildTeetimeSlots(clubEvent.id, 10, 5, 5)
	const slots3 = buildTeetimeSlots(clubEvent.id, 19, 5, 5)
	const eastSlots = slots1
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s1) => new RegistrationSlot(s1))
	const northSlots = slots2
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s2) => new RegistrationSlot(s2))
	const westSlots = slots3
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s3) => new RegistrationSlot(s3))
	clubEvent.totalGroups = 5
	clubEvent.startTime = "2:30 PM"

	const tables = LoadReserveTables(clubEvent, [...eastSlots, ...northSlots, ...westSlots])

	expect(tables.length).toBe(3)
	expect(tables[0].groups.length).toBe(5)
	expect(tables[0].groups[0].slots.length).toBe(5)
	expect(tables[0].groups[0].name).toEqual("2:30 PM")
	expect(tables[0].groups[1].name).toEqual("2:40 PM")
	expect(tables[0].groups[2].name).toEqual("2:50 PM")
	expect(tables[0].groups[3].name).toEqual("3:00 PM")
	expect(tables[0].groups[4].name).toEqual("3:10 PM")
})

test("builds teetime tables for alternating splits", () => {
	const eventData = getTestEvent(TestEventType.weeknight)
	const clubEvent = new ClubEvent(
		ClubEventApiSchema.parse({ ...eventData, ...{ tee_time_splits: "8,9" } }),
	)
	const slots1 = buildTeetimeSlots(clubEvent.id, 1, 5, 5)
	const slots2 = buildTeetimeSlots(clubEvent.id, 10, 5, 5)
	const slots3 = buildTeetimeSlots(clubEvent.id, 19, 5, 5)
	const eastSlots = slots1
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s1) => new RegistrationSlot(s1))
	const northSlots = slots2
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s2) => new RegistrationSlot(s2))
	const westSlots = slots3
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s3) => new RegistrationSlot(s3))
	clubEvent.totalGroups = 5
	clubEvent.startTime = "2:30 PM"

	const tables = LoadReserveTables(clubEvent, [...eastSlots, ...northSlots, ...westSlots])

	expect(tables.length).toBe(3)
	expect(tables[0].groups.length).toBe(5)
	expect(tables[0].groups[0].slots.length).toBe(5)
	expect(tables[0].groups[0].name).toEqual("2:30 PM")
	expect(tables[0].groups[1].name).toEqual("2:38 PM")
	expect(tables[0].groups[2].name).toEqual("2:47 PM")
	expect(tables[0].groups[3].name).toEqual("2:55 PM")
	expect(tables[0].groups[4].name).toEqual("3:04 PM")
})

test("builds shotgun tables for weeknight event", () => {
	const eventData = getTestEvent(TestEventType.shotgun)
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))
	const slots1 = buildTeetimeSlots(clubEvent.id, 1, 5, 5)
	const slots2 = buildTeetimeSlots(clubEvent.id, 10, 5, 5)
	const slots3 = buildTeetimeSlots(clubEvent.id, 19, 5, 5)
	const eastSlots = slots1
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s1) => new RegistrationSlot(s1))
	const northSlots = slots2
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s2) => new RegistrationSlot(s2))
	const westSlots = slots3
		.map((s) => RegistrationSlotApiSchema.parse(s))
		.map((s3) => new RegistrationSlot(s3))
	clubEvent.totalGroups = 5

	const tables = LoadReserveTables(clubEvent, [...eastSlots, ...northSlots, ...westSlots])

	expect(tables.length).toBe(3)
	expect(tables[0].groups.length).toBe(18)
	expect(tables[0].groups[0].slots.length).toBe(5)
	expect(tables[0].groups[0].name).toEqual("1A")
	expect(tables[0].groups[1].name).toEqual("1B")
	expect(tables[0].groups[2].name).toEqual("2A")
	expect(tables[0].groups[3].name).toEqual("2B")
	expect(tables[0].groups[4].name).toEqual("3A")
})
