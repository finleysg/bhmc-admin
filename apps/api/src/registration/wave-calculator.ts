import { ClubEvent, RegistrationTypeChoices, StartTypeChoices } from "@repo/domain/types"
import { fromMysqlDatetime } from "../common"

/**
 * Parse a MySQL datetime string (stored in UTC by Django) as a UTC Date.
 * Drizzle returns raw strings like "2026-02-18 20:00:00.000000" with no
 * timezone indicator, which `new Date()` would interpret as local time.
 */
export function parseUtcDatetime(value: string): Date {
	return new Date(fromMysqlDatetime(value))
}

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

	const signupStart = parseUtcDatetime(event.signupStart)
	const signupEnd = parseUtcDatetime(event.signupEnd)
	const priorityStart = event.prioritySignupStart
		? parseUtcDatetime(event.prioritySignupStart)
		: null

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
 * Calculates the current wave number for SSE consumers.
 * Returns -1 if registration hasn't opened yet (everything locked).
 * Returns 999 if no waves are configured (no restrictions).
 * Returns 1..N during priority signup waves.
 * Returns signupWaves + 1 when normal registration is open (all waves unlocked).
 */
export function getCurrentWave(event: ClubEvent, now: Date = new Date()): number {
	const firstOpen = event.prioritySignupStart ?? event.signupStart
	if (!firstOpen || now < parseUtcDatetime(firstOpen)) {
		return -1 // Pre-registration, everything locked
	}

	if (!event.signupWaves || !event.prioritySignupStart || !event.signupStart) {
		return 999 // No wave restrictions
	}

	const signupStart = parseUtcDatetime(event.signupStart)
	if (now >= signupStart) return event.signupWaves + 1

	const priorityStart = parseUtcDatetime(event.prioritySignupStart)
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
