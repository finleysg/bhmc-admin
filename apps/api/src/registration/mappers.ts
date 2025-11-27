import {
	Player,
	Registration,
	RegistrationFee,
	RegistrationSlot,
	RegistrationStatusValue,
} from "@repo/domain/types"

import { mapToCourseModel, mapToHoleModel } from "../courses/mappers"
import {
	PlayerModel,
	RegistrationFeeModel,
	RegistrationModel,
	RegistrationSlotModel,
} from "../database/models"
import { mapToEventFeeModel, mapToFeeTypeModel, toEventFee } from "../events/mappers"

/**
 * Maps database entity to PlayerModel
 */
export function mapToPlayerModel(entity: Record<string, any>): PlayerModel {
	return {
		id: entity.id,
		firstName: entity.firstName,
		lastName: entity.lastName,
		email: entity.email,
		phoneNumber: entity.phoneNumber,
		ghin: entity.ghin,
		tee: entity.tee,
		birthDate: entity.birthDate,
		saveLastCard: entity.saveLastCard,
		isMember: entity.isMember,
		userId: entity.userId,
		ggId: entity.ggId,
	}
}

/**
 * Maps database entity to RegistrationSlotModel
 */
export function mapToRegistrationSlotModel(entity: Record<string, any>): RegistrationSlotModel {
	return {
		id: entity.id,
		startingOrder: entity.startingOrder,
		slot: entity.slot,
		status: entity.status,
		eventId: entity.eventId,
		holeId: entity.holeId,
		playerId: entity.playerId,
		registrationId: entity.registrationId,
		ggId: entity.ggId,
	}
}

/**
 * Maps database entity to RegistrationModel
 */
export function mapToRegistrationModel(entity: Record<string, any>): RegistrationModel {
	return {
		id: entity.id,
		expires: entity.expires,
		startingHole: entity.startingHole,
		startingOrder: entity.startingOrder,
		notes: entity.notes,
		courseId: entity.courseId,
		eventId: entity.eventId,
		signedUpBy: entity.signedUpBy,
		userId: entity.userId,
		createdDate: entity.createdDate,
		ggId: entity.ggId,
	}
}

/**
 * Maps database entity to RegistrationFeeModel
 */
export function mapToRegistrationFeeModel(entity: Record<string, any>): RegistrationFeeModel {
	return {
		id: entity.id,
		isPaid: entity.isPaid,
		eventFeeId: entity.eventFeeId,
		paymentId: entity.paymentId,
		registrationSlotId: entity.registrationSlotId,
		amount: entity.amount,
	}
}

export function toPlayer(model: PlayerModel): Player {
	return {
		id: model.id,
		firstName: model.firstName,
		lastName: model.lastName,
		email: model.email,
		phoneNumber: model.phoneNumber,
		ghin: model.ghin,
		tee: model.tee,
		birthDate: model.birthDate,
		isMember: Boolean(model.isMember),
		ggId: model.ggId,
		userId: model.userId,
	}
}

export function toRegistration(model: RegistrationModel): Registration {
	return {
		id: model.id,
		eventId: model.eventId,
		startingHole: model.startingHole,
		startingOrder: model.startingOrder,
		notes: model.notes,
		courseId: model.courseId,
		course: undefined, // Not populated in current model structure
		signedUpBy: model.signedUpBy || "",
		userId: model.userId || 0,
		expires: model.expires,
		ggId: model.ggId,
		createdDate: model.createdDate,
		slots: [], // Not populated in current model structure
	}
}

export function toRegistrationSlot(model: RegistrationSlotModel): RegistrationSlot {
	return {
		id: model.id,
		registrationId: model.registrationId || 0,
		eventId: model.eventId,
		startingOrder: model.startingOrder,
		slot: model.slot,
		status: model.status as RegistrationStatusValue,
		holeId: model.holeId,
		hole: undefined, // Not populated in current model structure
		playerId: model.playerId,
		player: undefined, // Not populated in current model structure
		ggId: model.ggId,
		fees: [], // Not populated in current model structure
	}
}

export function toRegistrationFee(model: RegistrationFeeModel): RegistrationFee {
	return {
		id: model.id,
		registrationSlotId: model.registrationSlotId || 0, // Provide default if undefined
		paymentId: model.paymentId,
		amount: model.amount,
		isPaid: Boolean(model.isPaid),
		eventFeeId: model.eventFeeId,
		eventFee: undefined, // Not populated in current model structure
	}
}

/**
 * Maps joined query result to RegistrationModel with optional course.
 * Used by repository to return strongly-typed models from joined queries.
 */
export function mapToRegistrationWithCourse(row: {
	registration: Record<string, unknown>
	course: Record<string, unknown> | null
}): RegistrationModel {
	const model = mapToRegistrationModel(row.registration)
	if (row.course) {
		model.course = mapToCourseModel(row.course)
	}
	return model
}

/**
 * Maps joined query results to RegistrationSlotModel array with optional player and hole.
 * Used by repository to return strongly-typed models from joined queries.
 */
export function mapToSlotsWithPlayerAndHole(
	rows: Array<{
		slot: Record<string, unknown>
		player: Record<string, unknown> | null
		hole: Record<string, unknown> | null
	}>,
): RegistrationSlotModel[] {
	return rows.map((row) => {
		const model = mapToRegistrationSlotModel(row.slot)
		if (row.player) {
			model.player = mapToPlayerModel(row.player)
		}
		if (row.hole) {
			model.hole = mapToHoleModel(row.hole)
		}
		return model
	})
}

/**
 * Maps joined query results to RegistrationFeeModel array with optional eventFee.
 * Used by repository to return strongly-typed models from joined queries.
 */
export function mapToFeesWithEventFeeAndFeeType(
	rows: Array<{
		fee: Record<string, unknown>
		eventFee: Record<string, unknown> | null
		feeType: Record<string, unknown> | null
	}>,
): RegistrationFeeModel[] {
	return rows.map((row) => {
		const model = mapToRegistrationFeeModel(row.fee)
		if (row.eventFee) {
			const eventFeeModel = mapToEventFeeModel(row.eventFee)
			if (row.feeType) {
				eventFeeModel.feeType = mapToFeeTypeModel(row.feeType)
			}
			model.eventFee = eventFeeModel
		}
		return model
	})
}

/**
 * Hydrates registration slots with player and hole data from joined query results.
 * Takes raw database rows and returns fully hydrated RegistrationSlot domain objects.
 */
export function hydrateSlotsWithPlayerAndHole(
	slotRows: Array<{
		slot: Record<string, unknown>
		player: Record<string, unknown> | null
		hole: Record<string, unknown> | null
	}>,
): RegistrationSlot[] {
	return slotRows.map((row) => {
		const slot = toRegistrationSlot(mapToRegistrationSlotModel(row.slot))

		// Set nested player if present
		if (row.player) {
			slot.player = toPlayer(mapToPlayerModel(row.player))
		}

		// Set nested hole if present
		if (row.hole) {
			const holeModel = mapToHoleModel(row.hole)
			slot.hole = {
				id: holeModel.id,
				holeNumber: holeModel.holeNumber,
				par: holeModel.par,
				courseId: holeModel.courseId,
			}
		}

		// Initialize fees array
		slot.fees = []

		return slot
	})
}

/**
 * Attaches fees to slots based on joined query results.
 * Takes pre-hydrated slots and fee rows, mutates slots by populating their fees arrays.
 */
export function attachFeesToSlots(
	slots: RegistrationSlot[],
	feeRows: Array<{
		fee: Record<string, unknown>
		eventFee: Record<string, unknown> | null
		feeType: Record<string, unknown> | null
	}>,
): void {
	// Create map for efficient slot lookup
	const slotMap = new Map<number, RegistrationSlot>()
	for (const slot of slots) {
		if (slot.id) {
			slotMap.set(slot.id, slot)
		}
	}

	// Process each fee row
	for (const frow of feeRows) {
		const slotId = frow.fee.registrationSlotId as number | undefined
		if (!slotId) continue

		const slot = slotMap.get(slotId)
		if (!slot) continue

		// Map eventFee with feeType - both are guaranteed to exist at this point
		if (!frow.eventFee || !frow.feeType) continue

		const eventFeeModel = mapToEventFeeModel(frow.eventFee)
		eventFeeModel.feeType = mapToFeeTypeModel(frow.feeType)

		// Map registrationFee
		const registrationFeeModel = mapToRegistrationFeeModel({
			id: frow.fee.id,
			isPaid: frow.fee.isPaid,
			eventFeeId: frow.fee.eventFeeId,
			paymentId: frow.fee.paymentId,
			registrationSlotId: slotId,
			amount: frow.fee.amount,
		})

		// Transform to domain and set eventFee
		const fee = toRegistrationFee(registrationFeeModel)
		fee.eventFee = toEventFee(eventFeeModel)

		// Attach to slot
		slot.fees!.push(fee)
	}
}
