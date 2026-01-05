import {
	NotificationTypeValue,
	Payment,
	PaymentWithDetails,
	Player,
	Refund,
	Registration,
	RegistrationFee,
	RegistrationSlot,
	RegistrationSlotWithPlayerAndFees,
	RegistrationStatusValue,
	RegistrationWithSlots,
	CompleteRegistration,
	CompleteRegistrationSlot,
	CompleteRegistrationFee,
	CompleteCourse,
} from "@repo/domain/types"

import { toHole } from "../courses/mappers"
import type {
	CourseRow,
	EventFeeRow,
	FeeTypeRow,
	HoleRow,
	PaymentRow,
	PaymentRowWithDetails,
	PlayerRow,
	RefundRow,
	RegistrationFeeRow,
	RegistrationFull,
	RegistrationRow,
	RegistrationSlotFull,
	RegistrationSlotRow,
	CompleteRegistrationRow,
} from "../database"
import { toEventFeeWithType } from "../events/mappers"

/**
 * Maps PlayerRow to Player domain type
 */
export function toPlayer(row: PlayerRow): Player {
	return {
		id: row.id,
		firstName: row.firstName,
		lastName: row.lastName,
		email: row.email,
		phoneNumber: row.phoneNumber ?? undefined,
		ghin: row.ghin ?? undefined,
		tee: row.tee,
		birthDate: row.birthDate ?? undefined,
		isMember: Boolean(row.isMember),
		ggId: row.ggId ?? undefined,
		userId: row.userId ?? undefined,
		stripeCustomerId: row.stripeCustomerId ?? undefined,
	}
}

/**
 * Maps RegistrationRow to Registration domain type
 */
export function toRegistration(row: RegistrationRow): Registration {
	return {
		id: row.id,
		eventId: row.eventId,
		notes: row.notes ?? undefined,
		courseId: row.courseId ?? undefined,
		course: undefined,
		signedUpBy: row.signedUpBy ?? "",
		userId: row.userId ?? 0,
		expires: row.expires ?? undefined,
		ggId: row.ggId ?? undefined,
		createdDate: row.createdDate,
		slots: [],
	}
}

/**
 * Maps RegistrationSlotRow to RegistrationSlot domain type
 */
export function toRegistrationSlot(row: RegistrationSlotRow): RegistrationSlot {
	return {
		id: row.id,
		registrationId: row.registrationId ?? 0,
		eventId: row.eventId,
		startingOrder: row.startingOrder,
		slot: row.slot,
		status: row.status as RegistrationStatusValue,
		holeId: row.holeId ?? undefined,
		hole: undefined,
		playerId: row.playerId ?? undefined,
		player: undefined,
		ggId: row.ggId ?? undefined,
		fees: [],
	}
}

/**
 * Maps PaymentRow to Payment domain type
 */
export function toPayment(row: PaymentRow): Payment {
	return {
		id: row.id,
		paymentCode: row.paymentCode,
		paymentKey: row.paymentKey ?? null,
		notificationType: (row.notificationType as NotificationTypeValue) ?? null,
		confirmed: Boolean(row.confirmed),
		eventId: row.eventId,
		userId: row.userId,
		paymentAmount: parseFloat(row.paymentAmount),
		transactionFee: parseFloat(row.transactionFee),
		paymentDate: row.paymentDate ?? "",
		confirmDate: row.confirmDate ?? null,
	}
}

/**
 * Maps RefundRow to Refund domain type
 */
export function toRefund(row: RefundRow): Refund {
	return {
		id: row.id,
		refundCode: row.refundCode,
		refundAmount: parseFloat(row.refundAmount),
		notes: row.notes ?? null,
		confirmed: Boolean(row.confirmed),
		refundDate: row.refundDate ?? null,
		issuerId: row.issuerId,
		paymentId: row.paymentId,
	}
}

/**
 * Maps RegistrationFeeRow to RegistrationFee domain type
 */
export function toRegistrationFee(row: RegistrationFeeRow): RegistrationFee {
	return {
		id: row.id,
		registrationSlotId: row.registrationSlotId ?? 0,
		paymentId: row.paymentId,
		amount: parseFloat(row.amount),
		isPaid: Boolean(row.isPaid),
		eventFeeId: row.eventFeeId,
		eventFee: undefined,
	}
}

/**
 * Maps RegistrationFeeRow with EventFeeRow and FeeTypeRow to RegistrationFee with nested eventFee
 */
export function toRegistrationFeeWithEventFee(row: {
	fee: RegistrationFeeRow
	eventFee: EventFeeRow
	feeType: FeeTypeRow
}): RegistrationFee {
	return {
		...toRegistrationFee(row.fee),
		eventFee: toEventFeeWithType({ eventFee: row.eventFee, feeType: row.feeType }),
	}
}

/**
 * Hydrates registration slots with player and hole data from joined query results.
 * Takes raw database rows and returns fully hydrated RegistrationSlot domain objects.
 */
export function hydrateSlotsWithPlayerAndHole(
	slotRows: Array<{
		slot: RegistrationSlotRow
		player: PlayerRow | null
		hole: HoleRow | null
	}>,
): RegistrationSlot[] {
	return slotRows.map((row) => {
		const slot = toRegistrationSlot(row.slot)

		if (row.player) {
			slot.player = toPlayer(row.player)
		}

		if (row.hole) {
			slot.hole = toHole(row.hole)
		}

		slot.fees = []
		return slot
	})
}

/**
 * Attach registration fees to their corresponding RegistrationSlot objects.
 * Mutates the provided `slots` array in place.
 */
export function attachFeesToSlots(
	slots: RegistrationSlot[],
	feeRows: Array<{
		fee: RegistrationFeeRow
		eventFee: EventFeeRow | null
		feeType: FeeTypeRow | null
	}>,
): void {
	const slotMap = new Map<number, RegistrationSlot>()
	for (const slot of slots) {
		if (slot.id) {
			slotMap.set(slot.id, slot)
		}
	}

	for (const frow of feeRows) {
		const slotId = frow.fee.registrationSlotId
		if (!slotId) continue

		const slot = slotMap.get(slotId)
		if (!slot) continue

		if (!frow.eventFee || !frow.feeType) continue

		const fee = toRegistrationFeeWithEventFee({
			fee: frow.fee,
			eventFee: frow.eventFee,
			feeType: frow.feeType,
		})

		slot.fees!.push(fee)
	}
}

// =============================================================================
// Row type aliases for joined query results
// =============================================================================

export type RegistrationWithCourseRow = {
	registration: RegistrationRow
	course: CourseRow | null
}

export type SlotWithPlayerAndHoleRow = {
	slot: RegistrationSlotRow
	player: PlayerRow | null
	hole: HoleRow | null
}

export type FeeWithEventFeeRow = {
	fee: RegistrationFeeRow
	eventFee: EventFeeRow | null
	feeType: FeeTypeRow | null
}

export type PaymentWithRefundsRow = {
	payment: PaymentRow
	refunds: RefundRow[]
}

/**
 * Maps RegistrationSlotFull to RegistrationSlotWithPlayerAndFees domain type
 */
export function toRegistrationSlotWithPlayerAndFees(
	row: RegistrationSlotFull,
): RegistrationSlotWithPlayerAndFees {
	return {
		...toRegistrationSlot(row),
		player: row.player ? toPlayer(row.player) : null,
		fees: row.fees?.map(toRegistrationFee) ?? [],
	}
}

/**
 * Maps RegistrationFull to RegistrationWithSlots domain type
 */
export function toRegistrationWithSlots(row: RegistrationFull): RegistrationWithSlots {
	return {
		...toRegistration(row),
		slots: row.slots.map(toRegistrationSlotWithPlayerAndFees),
	}
}

export function toPaymentWithDetails(row: PaymentRowWithDetails): PaymentWithDetails {
	return {
		...toPayment(row),
		details: row.paymentDetails.map(toRegistrationFee),
	}
}

/**
 * Maps CompleteRegistrationRow to CompleteRegistration domain type.
 * Handles dummy course/hole for registrations without course details.
 */
export function toCompleteRegistration(row: CompleteRegistrationRow): CompleteRegistration {
	const hasCourseDetails = row.courseId != null

	const slots: CompleteRegistrationSlot[] = row.slots.map((slotRow) => {
		const fees: CompleteRegistrationFee[] = slotRow.fees.map((feeRow) => ({
			...toRegistrationFee(feeRow.fee),
			eventFee: toEventFeeWithType({ eventFee: feeRow.eventFee, feeType: feeRow.feeType }),
		}))

		return {
			id: slotRow.id,
			registrationId: slotRow.registrationId ?? 0,
			eventId: slotRow.eventId,
			startingOrder: slotRow.startingOrder,
			slot: slotRow.slot,
			status: slotRow.status as RegistrationStatusValue,
			holeId: slotRow.holeId ?? undefined,
			hole: slotRow.hole ? toHole(slotRow.hole) : { id: -1, courseId: -1, holeNumber: -1, par: -1 },
			playerId: slotRow.playerId ?? undefined,
			player: toPlayer(slotRow.player),
			ggId: slotRow.ggId ?? undefined,
			fees,
		}
	})

	const course: CompleteCourse =
		hasCourseDetails && row.course
			? {
					id: row.course.id,
					name: row.course.name,
					numberOfHoles: row.course.numberOfHoles,
					ggId: row.course.ggId ?? undefined,
					holes: [],
					tees: [],
				}
			: { id: -1, name: "dummy", numberOfHoles: 0, holes: [], tees: [] }

	return {
		id: row.id,
		eventId: row.eventId,
		notes: row.notes ?? undefined,
		courseId: row.courseId ?? undefined,
		course,
		signedUpBy: row.signedUpBy ?? "",
		userId: row.userId ?? 0,
		expires: row.expires ?? undefined,
		ggId: row.ggId ?? undefined,
		createdDate: row.createdDate,
		slots,
	}
}
