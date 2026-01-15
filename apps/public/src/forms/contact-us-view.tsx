import { UseFormReturn } from "react-hook-form"
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
	form: UseFormReturn<ContactMessageData>
	onCancel: () => void
	onSubmit: (args: ContactMessageData) => void
}

export function ContactUsView({ form, onCancel, onSubmit }: ContactUsViewProps) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	const submit = (data: ContactMessageData) => {
		// formState.isValid is always false
		if (formErrors.full_name || formErrors.email || formErrors.message_text) {
			return
		}
		onSubmit(data)
	}

	return (
		<form onSubmit={handleSubmit(submit)}>
			<InputControl
				name="full_name"
				type="text"
				label="Name"
				register={register("full_name")}
				error={formErrors.full_name}
			/>
			<InputControl
				name="email"
				type="email"
				label="Email"
				register={register("email")}
				error={formErrors.email}
			/>
			<TextareaControl
				name="message_text"
				label="Message"
				register={register("message_text")}
				error={formErrors.message_text}
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
