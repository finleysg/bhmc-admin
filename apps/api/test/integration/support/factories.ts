import {
	AgeRestrictionTypeChoices,
	EventStatusChoices,
	EventTypeChoices,
	RegistrationStatusChoices,
	RegistrationTypeChoices,
	StartTypeChoices,
	type AdminRole,
	type DjangoUser,
	ADMIN_ROLE_GROUPS,
} from "@repo/domain/types"

import {
	authUser,
	course,
	event,
	eventCourses,
	eventFee,
	feeType,
	hole,
	player,
	registration,
	registrationSlot,
	tee,
} from "../../../src/database"
import { testDb } from "./db"

let seq = 0
const next = () => ++seq
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ")

export interface TestUser extends DjangoUser {
	playerId: number
}

/**
 * Creates an auth_user and its player. `roles` become the user's groups as
 * returned by the (faked) Django token check.
 */
export async function createUser(
	options: { roles?: AdminRole[]; superuser?: boolean; staff?: boolean } = {},
): Promise<TestUser> {
	const n = next()
	const email = `user${n}@example.com`
	const db = testDb()
	const [userRow] = await db.insert(authUser).values({
		password: "!",
		isSuperuser: options.superuser ? 1 : 0,
		username: email,
		firstName: "Test",
		lastName: `User${n}`,
		email,
		isStaff: options.staff ? 1 : 0,
		isActive: 1,
		dateJoined: now(),
	})
	const [playerRow] = await db.insert(player).values({
		firstName: "Test",
		lastName: `User${n}`,
		email,
		tee: "Club",
		saveLastCard: 0,
		isMember: 1,
		userId: userRow.insertId,
	})
	return {
		id: userRow.insertId,
		email,
		firstName: "Test",
		lastName: `User${n}`,
		isActive: true,
		isStaff: options.staff ?? false,
		isSuperuser: options.superuser ?? false,
		ghin: null,
		birthDate: null,
		playerId: playerRow.insertId,
		groups: (options.roles ?? []).map((role) => ADMIN_ROLE_GROUPS[role]),
	}
}

/**
 * Creates a scheduled weeknight event where players choose their slots, with
 * what the API requires of such an event: a course (holes and tees) and a fee.
 */
export async function createEvent(overrides: Partial<typeof event.$inferInsert> = {}) {
	const n = next()
	const db = testDb()
	const values: typeof event.$inferInsert = {
		eventType: EventTypeChoices.WEEKNIGHT,
		name: `Test Event ${n}`,
		registrationType: RegistrationTypeChoices.MEMBER,
		canChoose: 1,
		ghinRequired: 0,
		startDate: "2027-05-05",
		startTime: "3:00 PM",
		startType: StartTypeChoices.TEETIMES,
		status: EventStatusChoices.SCHEDULED,
		season: 2027,
		starterTimeInterval: 0,
		teamSize: 1,
		groupSize: 4,
		ageRestrictionType: AgeRestrictionTypeChoices.NONE,
		...overrides,
	}
	const [eventRow] = await db.insert(event).values(values)
	const eventId = eventRow.insertId

	const [courseRow] = await db.insert(course).values({ name: `Course ${n}`, numberOfHoles: 9 })
	const courseId = courseRow.insertId
	await db.insert(hole).values({ courseId, holeNumber: 1, par: 4 })
	await db.insert(tee).values({ courseId, name: "Club" })
	await db.insert(eventCourses).values({ eventId, courseId })

	const [feeTypeRow] = await db
		.insert(feeType)
		.values({ name: `Green Fee ${n}`, code: "GF", payout: "Passthru", restriction: "None" })
	await db.insert(eventFee).values({
		eventId,
		feeTypeId: feeTypeRow.insertId,
		amount: "15.00",
		isRequired: 1,
		displayOrder: 1,
	})

	return { id: eventId, courseId, ...values }
}

/** Creates a registration with one Reserved slot per player. */
export async function createRegistration(eventId: number, players: TestUser[]) {
	const db = testDb()
	const [regRow] = await db.insert(registration).values({
		eventId,
		userId: players[0].id,
		signedUpBy: `${players[0].firstName} ${players[0].lastName}`,
		createdDate: now(),
	})
	const slotIds: number[] = []
	for (const [i, p] of players.entries()) {
		const [slotRow] = await db.insert(registrationSlot).values({
			eventId,
			registrationId: regRow.insertId,
			playerId: p.playerId,
			status: RegistrationStatusChoices.RESERVED,
			startingOrder: 0,
			slot: i,
		})
		slotIds.push(slotRow.insertId)
	}
	return { id: regRow.insertId, slotIds }
}
