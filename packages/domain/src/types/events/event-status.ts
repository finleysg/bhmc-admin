import { ClubEvent } from "./event"

export type ValidationResultType = "error" | "warning" | "info"

export interface ValidationAction {
	label: string
	type: "api-call" | "redirect"
	endpoint?: string
	url?: string
	method?: "POST" | "PUT"
}

export interface EventValidationResult {
	type: ValidationResultType
	code: string
	message: string
	action?: ValidationAction
}

export interface EventStatusInfo {
	event: ClubEvent
	availableSlotCount: number
	hasTeeTimeDocument: boolean
	isReadonly: boolean
	validations: EventValidationResult[]
}
