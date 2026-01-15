import { immerable } from "immer"
import { z } from "zod"

import { PlayerApiSchema, ServerPlayerApiSchema } from "./player"
import { PaymentDetail } from "./payment"

export const RegistrationFeeApiSchema = z.object({
	id: z.number(),
	event_fee: z.number(),
	registration_slot: z.number().nullish(),
	payment: z.number().nullish(),
	is_paid: z.boolean(),
	amount: z.string().nullish(),
})

export const RegistrationSlotApiSchema = z.object({
	id: z.number(),
	event: z.number(),
	registration: z.number().nullish(),
	hole: z.number().nullish(),
	player: PlayerApiSchema.nullish(),
	starting_order: z.number(),
	slot: z.number(),
	status: z.string(),
})

export const RegistrationApiSchema = z.object({
	id: z.number(),
	event: z.number(),
	course: z.number().nullish(),
	signed_up_by: z.string(),
	expires: z.coerce.date(),
	notes: z.string().nullish(),
	created_date: z.coerce.date(),
	slots: z.array(RegistrationSlotApiSchema),
})

export type RegistrationFeeData = z.infer<typeof RegistrationFeeApiSchema>
export type RegistrationSlotData = z.infer<typeof RegistrationSlotApiSchema>
export type RegistrationData = z.infer<typeof RegistrationApiSchema>

/* The data from serverUrl (nestjs backend) uses standard js/ts naming conventions */
export const ServerRegistrationFeeApiSchema = z.object({
	id: z.number(),
	eventFeeId: z.number(),
	registrationSlotId: z.number().nullish(),
	paymentId: z.number().nullish(),
	isPaid: z.boolean(),
	amount: z.string().nullish(),
})

export const ServerRegistrationSlotApiSchema = z.object({
	id: z.number(),
	eventId: z.number(),
	registrationId: z.number().nullish(),
	holeId: z.number().nullish(),
	player: ServerPlayerApiSchema.nullish(),
	startingOrder: z.number(),
	slot: z.number(),
	status: z.string(),
	fees: z.array(ServerRegistrationFeeApiSchema),
})

export const ServerRegistrationApiSchema = z.object({
	id: z.number(),
	eventId: z.number(),
	courseId: z.number().nullish(),
	signedUpBy: z.string(),
	expires: z.coerce.date(),
	notes: z.string().nullish(),
	createdDate: z.coerce.date(),
	slots: z.array(ServerRegistrationSlotApiSchema),
})

export type ServerRegistrationFeeData = z.infer<typeof ServerRegistrationFeeApiSchema>
export type ServerRegistrationSlotData = z.infer<typeof ServerRegistrationSlotApiSchema>
export type ServerRegistrationData = z.infer<typeof ServerRegistrationApiSchema>

export class RegistrationFee {
	[immerable] = true

	id: number
	eventFeeId: number
	registrationSlotId: number
	paymentId: number | null
	isPaid: boolean
	amount: number

	constructor(json?: RegistrationFeeData) {
		this.id = json?.id ?? 0
		this.eventFeeId = json?.event_fee ?? 0
		this.registrationSlotId = json?.registration_slot ?? 0
		this.paymentId = json?.payment ?? 0
		this.isPaid = json?.is_paid ?? false
		this.amount = json?.amount ? +json.amount : 0
	}

	static fromServerData = (json: ServerRegistrationFeeData) => {
		const fee = new RegistrationFee(undefined)
		fee.id = json.id
		fee.eventFeeId = json.eventFeeId
		fee.registrationSlotId = json.registrationSlotId ?? 0
		fee.paymentId = json.paymentId ?? 0
		fee.isPaid = json.isPaid
		fee.amount = json.amount ? +json.amount : 0
		return fee
	}

	static fromPaymentDetail = (detail: PaymentDetail) => {
		const fee = new RegistrationFee(undefined)
		fee.id = 0
		fee.eventFeeId = detail.eventFeeId
		fee.registrationSlotId = detail.slotId ?? 0
		fee.paymentId = detail.paymentId
		fee.isPaid = detail.isPaid
		fee.amount = detail.amount
		return fee
	}
}

export class RegistrationSlot {
	[immerable] = true

	id: number
	eventId: number
	registrationId: number
	holeId: number
	playerId: number
	playerName?: string
	sortName?: string
	startingOrder: number
	slot: number
	status: string
	fees: RegistrationFee[] = []

	constructor(json?: RegistrationSlotData) {
		this.id = json?.id ?? 0
		this.eventId = json?.event ?? 0
		this.registrationId = json?.registration ?? 0
		this.holeId = json?.hole ?? 0
		this.playerId = json?.player?.id ?? 0
		this.playerName = json?.player
			? `${json.player?.first_name} ${json.player?.last_name}`
			: undefined
		this.sortName = json?.player
			? `${json.player?.last_name}, ${json.player?.first_name}`
			: undefined
		this.startingOrder = json?.starting_order ?? 0
		this.slot = json?.slot ?? 0
		this.status = json?.status ?? ""
	}

	getTeamNumber = (teamSize: number) => {
		if (!teamSize || teamSize === 1) {
			return 0 // no team number for singles
		}
		return this.slot < teamSize ? 1 : 2
	}

	static fromServerData = (json: ServerRegistrationSlotData) => {
		const slot = new RegistrationSlot(undefined)
		slot.id = json.id
		slot.eventId = json.eventId
		slot.registrationId = json.registrationId ?? 0
		slot.holeId = json.holeId ?? 0
		slot.playerId = json.player?.id ?? 0
		slot.playerName = json.player ? `${json.player?.firstName} ${json.player?.lastName}` : undefined
		slot.sortName = json.player ? `${json.player?.lastName}, ${json.player?.firstName}` : undefined
		slot.startingOrder = json.startingOrder
		slot.slot = json.slot
		slot.status = json.status
		slot.fees = json.fees ? json.fees.map((f) => RegistrationFee.fromServerData(f)) : []
		return slot
	}
}

export class Registration {
	[immerable] = true

	id: number
	eventId: number
	courseId?: number | null
	signedUpBy: string
	expires: Date
	notes?: string | null
	createdDate: Date
	selectedStart?: string
	slots: RegistrationSlot[]

	constructor(json?: RegistrationData, selectedStart?: string) {
		this.id = json?.id ?? 0
		this.eventId = json?.event ?? 0
		this.courseId = json?.course
		this.signedUpBy = json?.signed_up_by ?? ""
		this.expires = json ? new Date(json.expires) : new Date()
		this.notes = json?.notes
		this.createdDate = json ? new Date(json.created_date) : new Date()
		this.selectedStart = selectedStart
		this.slots = json?.slots ? json.slots.map((s) => new RegistrationSlot(s)) : []
	}

	addSlots = (slots: RegistrationSlot[]) => {
		this.slots = [...slots]
	}

	static emptyRegistration = () => {
		return new Registration({
			id: 0,
			event: 0,
			signed_up_by: "",
			expires: new Date(),
			created_date: new Date(),
			slots: [],
			notes: "",
		})
	}

	static fromServerData = (json: ServerRegistrationData, selectedStart?: string) => {
		const registration = new Registration(undefined, selectedStart)
		registration.id = json.id
		registration.eventId = json.eventId
		registration.courseId = json.courseId
		registration.signedUpBy = json.signedUpBy
		registration.expires = new Date(json.expires)
		registration.notes = json.notes
		registration.createdDate = new Date(json.createdDate)
		registration.selectedStart = selectedStart
		registration.slots = json.slots ? json.slots.map((s) => RegistrationSlot.fromServerData(s)) : []
		return registration
	}
}
