import { EventFee } from "@repo/domain/types"

export type Fee = Omit<EventFee, "feeType" | "feeTypeId"> & {
	id: number
	code: string
	name: string
	registrationFeeId?: number
	isSelected: boolean
	canChange: boolean
}

export type PlayerFees = {
	playerId: number
	playerName: string
	fees: Fee[]
	subtotal: number
}
