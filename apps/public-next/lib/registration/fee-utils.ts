import { differenceInYears } from "date-fns"

import type { EventFee } from "../types"
import { FeeRestriction } from "./types"

const SENIOR_RATE_AGE = 62

export interface FeePlayer {
	birthDate: string | null
	isMember: boolean
	lastSeason: number | null
}

export function calculateFeeAmount(fee: EventFee, player?: FeePlayer): number {
	const amount = Number(fee.amount)
	const overrideAmount = fee.override_amount ? Number(fee.override_amount) : null
	if (player && fee.override_restriction && overrideAmount !== null) {
		const match = evaluateRestriction(fee.override_restriction, player)
		return match ? overrideAmount : amount
	}
	return amount
}

export function evaluateRestriction(restriction: string, player: FeePlayer): boolean {
	const currentYear = new Date().getFullYear()
	const isReturningMember = player.lastSeason === currentYear - 1
	const age = player.birthDate ? differenceInYears(new Date(), new Date(player.birthDate)) : 0

	switch (restriction) {
		case FeeRestriction.Seniors:
			return age >= SENIOR_RATE_AGE
		case FeeRestriction.NonSeniors:
			return age < SENIOR_RATE_AGE
		case FeeRestriction.NewMembers:
			return !isReturningMember
		case FeeRestriction.ReturningMembers:
			return isReturningMember
		case FeeRestriction.Members:
			return player.isMember
		case FeeRestriction.NonMembers:
			return !player.isMember
		default:
			return false
	}
}
