import { ClubEvent } from "../types/events/event"
import { EventValidationResult } from "../types/events/event-status"

/**
 * Parse event start date and time into a Date object
 */
export function parseEventStartDateTime(event: ClubEvent): Date {
	const dateStr = event.startDate
	const timeStr = event.startTime || "00:00:00"
	return new Date(`${dateStr}T${timeStr}`)
}

/**
 * Validate event status and return any configuration errors, warnings, or info messages
 */
export function validateEventStatus(
	event: ClubEvent,
	availableSlotCount: number,
	hasTeeTimeDocument: boolean,
): EventValidationResult[] {
	const validations: EventValidationResult[] = []
	const now = new Date()
	const eventStart = parseEventStartDateTime(event)
	const isReadonly = eventStart <= now

	// Skip validations for past events (readonly)
	if (isReadonly) {
		return []
	}

	const signupEnded = event.signupEnd ? new Date(event.signupEnd) <= now : false

	// Error: No slots available AND canChoose is true
	if (availableSlotCount === 0 && event.canChoose) {
		validations.push({
			type: "error",
			code: "no-slots-can-choose",
			message:
				"No registration slots available. Players cannot choose starting holes without slots.",
			action: {
				label: "Create Slots",
				type: "api-call",
				endpoint: `/api/django/events/${event.id}/create-slots`,
				method: "POST",
			},
		})
	}

	// Error: No slots available AND canChoose is false AND signup not ended
	if (
		availableSlotCount === 0 &&
		!event.canChoose &&
		!signupEnded &&
		event.registrationMaximum === 0
	) {
		validations.push({
			type: "error",
			code: "no-slots-no-choose",
			message:
				"Event has no registration maximum set and signup has not ended. Configure registration in Django admin.",
			action: {
				label: "Edit in Django",
				type: "redirect",
				url: `/admin/events/event/${event.id}/change/`,
			},
		})
	}

	// Info: Slots available AND canChoose is true AND signup not ended
	if (availableSlotCount > 0 && event.canChoose && !signupEnded) {
		validations.push({
			type: "info",
			code: "can-add-teetime",
			message:
				"Registration slots are available. You can add a tee time document for players to choose starting holes.",
			action: {
				label: "Add Tee Time",
				type: "api-call",
				endpoint: `/api/django/events/${event.id}/append-teetime`,
				method: "PUT",
			},
		})
	}

	// Warning: Missing Golf Genius ID
	if (!event.ggId) {
		validations.push({
			type: "warning",
			code: "missing-gg-id",
			message: "Golf Genius ID is not configured. Configure to enable tournament integration.",
			action: {
				label: "Configure Golf Genius",
				type: "redirect",
				url: `/events/${event.id}/golf-genius`,
			},
		})
	}

	// Warning: Signup ended AND event not started AND no tee time document
	if (signupEnded && !hasTeeTimeDocument) {
		validations.push({
			type: "warning",
			code: "no-teetime-document",
			message: "Signup has ended but no tee time document has been created.",
		})
	}

	return validations
}
