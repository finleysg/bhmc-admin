"use server"

import { revalidatePath } from "next/cache"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

const path = (eventId: number) => `/events/${eventId}/readiness/dismissals`

export async function dismissWarning(
	eventId: number,
	code: string,
	subject: string,
): Promise<FormState> {
	const result = await apiRequest(path(eventId), "POST", { code, subject })
	if (!result.ok) return { status: "error", message: result.message }
	// The layout shows the readiness indicator.
	revalidatePath(`/events/${eventId}`, "layout")
	return { status: "success", message: "Warning dismissed" }
}

export async function restoreWarning(
	eventId: number,
	code: string,
	subject: string,
): Promise<FormState> {
	const query = new URLSearchParams({ code, subject })
	const result = await apiRequest(`${path(eventId)}?${query}`, "DELETE")
	if (!result.ok) return { status: "error", message: result.message }
	revalidatePath(`/events/${eventId}`, "layout")
	return { status: "success", message: "Warning restored" }
}
