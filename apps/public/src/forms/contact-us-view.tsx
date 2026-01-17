import { FormEvent } from "react"

import { z } from "zod"

import { InputControl } from "../components/forms/input-control"
import { TextareaControl } from "../components/forms/textarea-control"

export const ContactMessageSchema = z.object({
	full_name: z.string().trim().min(1, "Please enter your name."),
	email: z.string().trim().min(1, "A valid email address is required.").email(),
	message_text: z.string().trim().min(1, "Enter the text of your message."),
})
export type ContactMessageData = z.infer<typeof ContactMessageSchema>

interface ContactUsViewProps {
	formData: ContactMessageData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof ContactMessageData, value: string) => void
	onSubmit: (e: FormEvent) => void
	onCancel: () => void
}

export function ContactUsView({
	formData,
	errors,
	isSubmitting,
	onChange,
	onSubmit,
	onCancel,
}: ContactUsViewProps) {
	return (
		<form onSubmit={onSubmit}>
			<InputControl
				name="full_name"
				type="text"
				label="Name"
				value={formData.full_name}
				onChange={(e) => onChange("full_name", e.target.value)}
				error={errors.full_name}
			/>
			<InputControl
				name="email"
				type="email"
				label="Email"
				value={formData.email}
				onChange={(e) => onChange("email", e.target.value)}
				error={errors.email}
			/>
			<TextareaControl
				name="message_text"
				label="Message"
				value={formData.message_text}
				onChange={(e) => onChange("message_text", e.target.value)}
				error={errors.message_text}
			/>
			<div className="mt-4">
				<button type="submit" className="btn btn-primary btn-sm me-2" disabled={isSubmitting}>
					Send Message
				</button>
				<button
					type="reset"
					className="btn btn-light btn-sm"
					disabled={isSubmitting}
					onClick={onCancel}
				>
					Cancel
				</button>
			</div>
		</form>
	)
}
