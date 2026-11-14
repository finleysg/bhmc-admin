"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ADMIN_ROLE_GROUPS, type AdminRole, type PlayerUpdate } from "@repo/domain/types"

import { apiRequest } from "@/lib/server-api"

/** Result of a form submission, rendered by the form via useActionState. */
export interface FormState<Field extends string = string> {
	status: "idle" | "success" | "error"
	message?: string
	fieldErrors?: Partial<Record<Field, string>>
}

/** Blank strings become null, matching the API's "not set". */
const optionalText = (max?: number, message?: string) =>
	(max ? z.string().trim().max(max, message) : z.string().trim()).transform((v) => v || null)

const playerSchema = z.object({
	firstName: z.string().trim().min(1, "First name is required"),
	lastName: z.string().trim().min(1, "Last name is required"),
	email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email")),
	phoneNumber: optionalText(),
	ghin: optionalText(8, "GHIN is at most 8 characters"),
	tee: z.enum(["Club", "Gold"]),
	birthDate: optionalText(),
	isMember: z.boolean(),
}) satisfies z.ZodType<PlayerUpdate>

export type PlayerField = keyof z.input<typeof playerSchema>

export async function updatePlayer(
	playerId: number,
	_prev: FormState<PlayerField>,
	formData: FormData,
): Promise<FormState<PlayerField>> {
	const parsed = playerSchema.safeParse({
		firstName: formData.get("firstName") ?? "",
		lastName: formData.get("lastName") ?? "",
		email: formData.get("email") ?? "",
		phoneNumber: formData.get("phoneNumber") ?? "",
		ghin: formData.get("ghin") ?? "",
		tee: formData.get("tee") ?? "",
		birthDate: formData.get("birthDate") ?? "",
		isMember: formData.get("isMember") === "on",
	})
	if (!parsed.success) {
		const fieldErrors: Partial<Record<PlayerField, string>> = {}
		for (const issue of parsed.error.issues) {
			const field = issue.path[0] as PlayerField
			fieldErrors[field] ??= issue.message
		}
		return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
	}

	const result = await apiRequest(`/registration/players/${playerId}`, "PATCH", parsed.data)
	if (!result.ok) return { status: "error", message: result.message }

	revalidatePath(`/club/players/${playerId}`)
	return { status: "success", message: "Player updated" }
}

const rolesSchema = z.array(z.enum(Object.keys(ADMIN_ROLE_GROUPS) as [AdminRole, ...AdminRole[]]))

export async function setPlayerRoles(
	playerId: number,
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const parsed = rolesSchema.safeParse(formData.getAll("roles"))
	if (!parsed.success) return { status: "error", message: "Unknown admin role" }

	const result = await apiRequest(`/players/${playerId}/roles`, "PUT", { roles: parsed.data })
	if (!result.ok) return { status: "error", message: result.message }

	revalidatePath(`/club/players/${playerId}`)
	return { status: "success", message: "Admin roles updated" }
}
