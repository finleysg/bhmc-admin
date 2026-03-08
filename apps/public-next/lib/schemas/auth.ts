import { z } from "zod"

export const RegisterAccountSchema = z
	.object({
		first_name: z.string().trim().min(1, "You must provide a first name."),
		last_name: z.string().trim().min(1, "You must provide a last name."),
		email: z.string().trim().min(1, "A valid email address is required.").email(),
		ghin: z.string().optional(),
		password: z.string().trim().min(8, "Your password must be at least 8 characters long."),
		re_password: z.string().trim().min(8, "Your password must be at least 8 characters long."),
	})
	.superRefine(({ password, re_password }, ctx) => {
		if (password !== re_password) {
			ctx.addIssue({
				code: "custom",
				message: "The passwords do not match.",
				path: ["re_password"],
			})
		}
	})

export const RequestPasswordSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
})

export const ResetPasswordSchema = z
	.object({
		new_password: z.string().trim().min(8, "Your password must be at least 8 characters long."),
		re_new_password: z.string().trim().min(8, "Your password must be at least 8 characters long."),
	})
	.superRefine(({ new_password, re_new_password }, ctx) => {
		if (new_password !== re_new_password) {
			ctx.addIssue({
				code: "custom",
				message: "The passwords do not match.",
				path: ["re_new_password"],
			})
		}
	})

export type RegisterData = z.infer<typeof RegisterAccountSchema>
export type RequestPasswordData = z.infer<typeof RequestPasswordSchema>
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>
