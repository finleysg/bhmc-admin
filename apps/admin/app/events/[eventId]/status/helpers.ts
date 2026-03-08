import { parseLocalDate, parseUtcDateTime, registrationHasStarted } from "@repo/domain/functions"
import { StartTypeChoices, ClubEvent } from "@repo/domain/types"

export const START_TYPE_LABELS: Record<string, string> = {
	[StartTypeChoices.TEETIMES]: "Tee Times",
	[StartTypeChoices.SHOTGUN]: "Shotgun",
	[StartTypeChoices.NONE]: "N/A",
}

export function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return "Not set"
	const date = parseLocalDate(dateString)
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

export function formatDateTime(dateTimeString: string | null | undefined): string {
	if (!dateTimeString) return "Not set"
	const date = parseUtcDateTime(dateTimeString)
	return date.toLocaleString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
}

export function getStartTypeLabel(startType: string | null | undefined): string {
	return START_TYPE_LABELS[startType || ""] || "N/A"
}

// Button state helpers
export function shouldDisableCreateSlots(isCreatingSlots: boolean, event: ClubEvent): boolean {
	return isCreatingSlots || registrationHasStarted(event)
}

export function shouldDisableAddTeeTime(totalSpots: number, isAddingTeeTime: boolean): boolean {
	return totalSpots === 0 || isAddingTeeTime
}

export function shouldShowRecreateModal(totalSpots: number): boolean {
	return totalSpots > 0
}

export function getCreateButtonLabel(totalSpots: number): string {
	return totalSpots > 0 ? "Recreate Slots" : "Create Slots"
}

// Badge variant helpers
export type BadgeVariant = "success" | "warning"

export function getSlotsCreatedVariant(totalSpots: number): BadgeVariant {
	return totalSpots > 0 ? "success" : "warning"
}

export function getGolfGeniusVariant(ggId: string | null | undefined): BadgeVariant {
	return ggId ? "success" : "warning"
}

export function getDocumentsVariant(documentsCount: number): BadgeVariant {
	return documentsCount > 0 ? "success" : "warning"
}
