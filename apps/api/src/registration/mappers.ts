import { Player, Registration, RegistrationFee, RegistrationSlot } from "@repo/domain/types"

import {
	PlayerModel,
	RegistrationFeeModel,
	RegistrationModel,
	RegistrationSlotModel,
} from "../database/models"

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
		status: model.status,
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
