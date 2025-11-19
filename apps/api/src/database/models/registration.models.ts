import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import {
	payment,
	player,
	playerFavorites,
	refund,
	registration,
	registrationFee,
	registrationSlot,
} from "../schema"

export const paymentInsertSchema = createInsertSchema(payment)
export const paymentUpdateSchema = createUpdateSchema(payment)
export const refundInsertSchema = createInsertSchema(refund)
export const refundUpdateSchema = createUpdateSchema(refund)
export const playerInsertSchema = createInsertSchema(player)
export const playerUpdateSchema = createUpdateSchema(player)
export const playerFavoriteInsertSchema = createInsertSchema(playerFavorites)
export const playerFavoriteUpdateSchema = createUpdateSchema(playerFavorites)
export const registrationInsertSchema = createInsertSchema(registration)
export const registrationUpdateSchema = createUpdateSchema(registration)
export const registrationFeeInsertSchema = createInsertSchema(registrationFee)
export const registrationFeeUpdateSchema = createUpdateSchema(registrationFee)
export const registrationSlotInsertSchema = createInsertSchema(registrationSlot)
export const registrationSlotUpdateSchema = createUpdateSchema(registrationSlot)

// Payment Model
export class PaymentModel {
	@IsInt()
	id!: number

	@IsString()
	@MaxLength(40)
	paymentCode!: string

	@IsOptional()
	@IsString()
	@MaxLength(100)
	paymentKey?: string

	@IsOptional()
	@IsString()
	@MaxLength(1)
	notificationType?: string

	@IsNumber()
	@Min(0)
	@Max(1)
	confirmed!: number

	@IsInt()
	eventId!: number

	@IsInt()
	userId!: number

	@IsNumber()
	paymentAmount!: number

	@IsNumber()
	transactionFee!: number

	@IsOptional()
	@IsString()
	paymentDate?: string // Datetime as string

	@IsOptional()
	@IsString()
	confirmDate?: string // Datetime as string

	@IsOptional()
	paymentDetails?: RegistrationFeeModel[]

	@IsOptional()
	refunds?: RefundModel[]
}

// Player Model
export class RefundModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsString()
	@MaxLength(40)
	refundCode!: string

	@IsNumber()
	refundAmount!: number

	@IsOptional()
	@IsString()
	notes?: string

	@IsNumber()
	@Min(0)
	@Max(1)
	confirmed!: number

	@IsString()
	refundDate!: string // Datetime as string, but marked as required in schema

	@IsInt()
	issuerId!: number

	@IsInt()
	paymentId!: number
}

// Player Model
export class PlayerModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsString()
	@MaxLength(30)
	firstName!: string

	@IsString()
	@MaxLength(30)
	lastName!: string

	@IsString()
	@MaxLength(200)
	email!: string

	@IsOptional()
	@IsString()
	@MaxLength(20)
	phoneNumber?: string

	@IsOptional()
	@IsString()
	@MaxLength(8)
	ghin?: string

	@IsString()
	@MaxLength(8)
	tee!: string

	@IsOptional()
	@IsString()
	birthDate?: string // Date as string

	@IsNumber()
	@Min(0)
	@Max(1)
	saveLastCard!: number

	@IsOptional()
	@IsString()
	@MaxLength(40)
	stripeCustomerId?: string

	@IsOptional()
	@IsInt()
	profilePictureId?: number

	@IsNumber()
	@Min(0)
	@Max(1)
	isMember!: number

	@IsOptional()
	@IsInt()
	lastSeason?: number

	@IsOptional()
	@IsString()
	@MaxLength(22)
	ggId?: string

	@IsOptional()
	@IsInt()
	userId?: number
}

// Player Favorites (junction)
export class PlayerFavoriteModel {
	@IsInt()
	id!: number

	@IsInt()
	fromPlayerId!: number

	@IsInt()
	toPlayerId!: number
}

// Registration Model
export class RegistrationModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsOptional()
	@IsString()
	expires?: string // Datetime as string

	@IsInt()
	startingHole!: number

	@IsInt()
	startingOrder!: number

	@IsOptional()
	@IsString()
	notes?: string

	@IsOptional()
	@IsInt()
	courseId?: number

	@IsInt()
	eventId!: number

	@IsOptional()
	@IsString()
	@MaxLength(40)
	signedUpBy?: string

	@IsOptional()
	@IsInt()
	userId?: number

	@IsString()
	createdDate!: string // Datetime as string

	@IsOptional()
	@IsString()
	@MaxLength(22)
	ggId?: string

	@IsOptional()
	slots?: RegistrationSlotModel[]

	@IsOptional()
	fees?: RegistrationFeeModel[]
}

// Registration Fee
export class RegistrationFeeModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsNumber()
	@Min(0)
	@Max(1)
	isPaid!: number

	@IsInt()
	eventFeeId!: number

	@IsInt()
	paymentId!: number

	@IsOptional()
	@IsInt()
	registrationSlotId?: number

	@IsNumber()
	amount!: number
}

// Registration Slot
export class RegistrationSlotModel {
	@IsInt()
	id!: number

	@IsInt()
	startingOrder!: number

	@IsInt()
	slot!: number

	@IsString()
	@MaxLength(1)
	status!: string

	@IsInt()
	eventId!: number

	@IsOptional()
	@IsInt()
	holeId?: number

	@IsOptional()
	@IsInt()
	playerId?: number

	@IsOptional()
	@IsInt()
	registrationId?: number

	@IsOptional()
	@IsString()
	@MaxLength(22)
	ggId?: string
}
