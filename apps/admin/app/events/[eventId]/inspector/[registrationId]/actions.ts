"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { AddFeeRequest, InspectorSlotStatus } from "@repo/domain/types"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

const STATUS_NAMES: Record<InspectorSlotStatus, string> = {
	R: "Reserved",
	A: "Available",
	U: "Unavailable",
}

const done = (eventId: number, registrationId: number, message: string): FormState => {
	revalidatePath(`/events/${eventId}/inspector/${registrationId}`)
	return { status: "success", message }
}

/** Sets a slot to Reserved, Available, or Unavailable. */
export async function setSlotStatus(
	registrationId: number,
	eventId: number,
	slotId: number,
	status: InspectorSlotStatus,
): Promise<FormState> {
	const result = await apiRequest<void>(
		`/registration-inspector/events/${eventId}/slots/${slotId}/status`,
		"PUT",
		{ status },
	)
	if (!result.ok) return { status: "error", message: result.message }
	return done(eventId, registrationId, `Slot set to ${STATUS_NAMES[status]}`)
}

export type AddFeeField = "eventFeeId" | "paidBy"

const eventFeeId = z.coerce.number({ error: "Choose a fee" }).int().positive("Choose a fee")

const addFeeSchema = z.union([
	z.object({ eventFeeId, waived: z.literal(true) }),
	z.object({
		eventFeeId,
		waived: z.literal(false),
		paidBy: z.string().trim().min(1, "Say how it was paid").max(40, "At most 40 characters"),
	}),
])

/** Adds an event fee to a player's slot, recorded as paid outside Stripe, or waived at $0. */
export async function addFee(
	registrationId: number,
	eventId: number,
	slotId: number,
	_prev: FormState<AddFeeField>,
	formData: FormData,
): Promise<FormState<AddFeeField>> {
	const waived = formData.get("waived") === "on"
	const parsed = addFeeSchema.safeParse({
		eventFeeId: formData.get("eventFeeId") ?? "",
		waived,
		...(waived ? {} : { paidBy: formData.get("paidBy") ?? "" }),
	})
	if (!parsed.success) {
		// A union reports each branch's issues; show those of the branch the form chose.
		const issues = parsed.error.issues.flatMap((i) =>
			i.code === "invalid_union" ? i.errors[waived ? 0 : 1] : [i],
		)
		const fieldErrors: Partial<Record<AddFeeField, string>> = {}
		for (const issue of issues) {
			fieldErrors[issue.path[0] as AddFeeField] ??= issue.message
		}
		return { status: "error", message: "Check the highlighted fields", fieldErrors }
	}
	const body: AddFeeRequest = parsed.data
	const result = await apiRequest<void>(
		`/registration-inspector/events/${eventId}/slots/${slotId}/fees`,
		"POST",
		body,
	)
	if (!result.ok) return { status: "error", message: result.message }
	return done(eventId, registrationId, waived ? "Fee waived" : "Fee added")
}

/** Removes a fee from its slot, refunding it through Stripe first when `refund`. */
export async function removeFee(
	registrationId: number,
	eventId: number,
	feeId: number,
	refund: boolean,
): Promise<FormState> {
	const result = await apiRequest<void>(
		`/registration-inspector/events/${eventId}/fees/${feeId}${refund ? "?refund=true" : ""}`,
		"DELETE",
	)
	if (!result.ok) return { status: "error", message: result.message }
	return done(eventId, registrationId, refund ? "Fee refunded and removed" : "Fee removed")
}
