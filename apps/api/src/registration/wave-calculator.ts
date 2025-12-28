import { ClubEvent, RegistrationTypeChoices, StartTypeChoices } from "@repo/domain/types"

export type RegistrationWindow = "n/a" | "future" | "priority" | "registration" | "past"

/**
 * Determines the current registration window for an event.
 */
export function getRegistrationWindow(
	event: ClubEvent,
	now: Date = new Date(),
): RegistrationWindow {
	if (event.registrationType === RegistrationTypeChoices.NONE) return "n/a"
	if (!event.signupStart || !event.signupEnd) return "n/a"

	const signupStart = new Date(event.signupStart)
	const signupEnd = new Date(event.signupEnd)
	const priorityStart = event.prioritySignupStart ? new Date(event.prioritySignupStart) : null

	if (priorityStart && now >= priorityStart && now < signupStart) {
		return "priority"
	}
	if (now >= signupStart && now < signupEnd) {
		return "registration"
	}
	if (now >= signupEnd) {
		return "past"
	}
	return "future"
}

/**
 * Calculates the current wave number during priority signup.
 * Returns 999 if no waves are configured (no restrictions).
 * Returns 0 if priority signup hasn't started.
 * Returns signupWaves + 1 if regular signup has started.
 */
export function getCurrentWave(event: ClubEvent, now: Date = new Date()): number {
	if (!event.signupWaves || !event.prioritySignupStart || !event.signupStart) {
		return 999 // No wave restrictions
	}

	const priorityStart = new Date(event.prioritySignupStart)
	const signupStart = new Date(event.signupStart)

	if (now < priorityStart) return 0
	if (now >= signupStart) return event.signupWaves + 1

	const priorityDurationMs = signupStart.getTime() - priorityStart.getTime()
	const waveDurationMs = priorityDurationMs / event.signupWaves
	const elapsedMs = now.getTime() - priorityStart.getTime()

	return Math.min(Math.floor(elapsedMs / waveDurationMs) + 1, event.signupWaves)
}

/**
 * Determines which wave a slot belongs to based on its position.
 * For shotgun starts, combines hole number and starting order.
 * Returns 1 if no waves are configured.
 */
export function getStartingWave(
	event: ClubEvent,
	startingOrder: number,
	holeNumber?: number,
): number {
	if (!event.signupWaves || !event.totalGroups) return 1

	let effectiveOrder = startingOrder
	if (event.startType === StartTypeChoices.SHOTGUN && holeNumber) {
		effectiveOrder = (holeNumber - 1) * 2 + startingOrder
	}

	const base = Math.floor(event.totalGroups / event.signupWaves)
	const remainder = event.totalGroups % event.signupWaves
	const cutoff = remainder * (base + 1)

	if (effectiveOrder < cutoff) {
		return Math.floor(effectiveOrder / (base + 1)) + 1
	} else {
		return remainder + Math.floor((effectiveOrder - cutoff) / base) + 1
	}
}
