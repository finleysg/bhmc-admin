import { z } from "zod"

export const PlayerUpdateSchema = z.object({
	first_name: z.string().min(1, "First name is required"),
	last_name: z.string().min(1, "Last name is required"),
	email: z.string().email("Invalid email address"),
	ghin: z.string().optional().or(z.literal("")),
	birth_date: z.string().optional().or(z.literal("")),
	phone_number: z.string().optional().or(z.literal("")),
})

export type PlayerUpdateData = z.infer<typeof PlayerUpdateSchema>

export const ChangePasswordSchema = z
	.object({
		current_password: z.string().min(1, "Current password is required"),
		new_password: z.string().min(8, "Password must be at least 8 characters"),
		re_new_password: z.string().min(1, "Please confirm your new password"),
	})
	.refine((data) => data.new_password === data.re_new_password, {
		message: "Passwords do not match",
		path: ["re_new_password"],
	})

export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>
