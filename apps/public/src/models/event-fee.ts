import { immerable } from "immer"
import { z } from "zod"

import { Player } from "./player"

export const FeeTypeApiSchema = z.object({
	id: z.number(),
	name: z.string(),
	code: z.string(),
	restriction: z.string(),
})

export const EventFeeApiSchema = z.object({
	id: z.number(),
	event: z.number(),
	amount: z.coerce.number(),
	override_amount: z.coerce.number().nullish(),
	override_restriction: z.string().nullish(),
	display_order: z.number(),
	is_required: z.boolean(),
	fee_type: FeeTypeApiSchema,
})

export type FeeTypeData = z.infer<typeof FeeTypeApiSchema>
export type EventFeeData = z.infer<typeof EventFeeApiSchema>

export class EventFee {
	[immerable] = true

	id: number
	eventId: number
	amount: number
	overrideAmount?: number | null
	overrideRestriction?: string | null
	displayOrder: number
	name: string
	code: string
	isRequired: boolean
	isSkinsFee: boolean
	hasOverride: boolean = false

	constructor(json: EventFeeData) {
		this.id = json.id
		this.eventId = json.event
		this.amount = json.amount
		this.overrideAmount = json.override_amount
		this.overrideRestriction = json.override_restriction
		this.displayOrder = json.display_order
		this.name = json.fee_type.name
		this.code = json.fee_type.code
		this.isRequired = json.is_required
		this.isSkinsFee = this.name.toLowerCase().indexOf("skins") >= 0
		this.hasOverride = this.overrideRestriction !== null
	}

	amountDue = (player?: Player) => {
		if (player && this.overrideRestriction && this.overrideAmount) {
			const match = player.evaluateRestriction(this.overrideRestriction)
			return match ? this.overrideAmount : this.amount
		}
		return this.amount
	}
}
