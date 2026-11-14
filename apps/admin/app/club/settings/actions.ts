"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { FormState } from "@/lib/form-state"
import { apiRequest } from "@/lib/server-api"

const integerValue = z
	.string()
	.trim()
	.min(1, "Enter a value")
	.transform(Number)
	.pipe(z.number({ error: "Enter a whole number" }).int("Enter a whole number"))

/** Saves one setting. The API checks the setting's own limits. */
export async function updateSetting(
	key: string,
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const parsed = integerValue.safeParse(formData.get("value") ?? "")
	if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message }

	const result = await apiRequest(`/settings/${encodeURIComponent(key)}`, "PUT", {
		value: parsed.data,
	})
	if (!result.ok) return { status: "error", message: result.message }

	revalidatePath("/club/settings")
	return { status: "success", message: "Setting saved" }
}
