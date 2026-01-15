import { useForm } from "react-hook-form"
import { z } from "zod"

import { zodResolver } from "@hookform/resolvers/zod"

import { InputControl } from "../forms/input-control"

const EventPortalSchema = z.object({
	portal_url: z.string().url("Copy and paste the portal url here."),
})
type EventPortalData = z.infer<typeof EventPortalSchema>

interface EventPortalFormProps {
	onSubmit: (url: string) => void
}

export function EventPortalForm({ onSubmit }: EventPortalFormProps) {
	const form = useForm<EventPortalData>({
		resolver: zodResolver(EventPortalSchema),
	})
	const { reset, register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	const handleUrlSubmit = (values: EventPortalData) => {
		onSubmit(values.portal_url)
		reset()
	}

	return (
		<div>
			<form onSubmit={handleSubmit(handleUrlSubmit)}>
				<InputControl
					name="portal_url"
					label="Portal Url"
					register={register("portal_url")}
					error={formErrors.portal_url}
					type="text"
				/>
				<div className="d-flex justify-content-end mt-2">
					<button type="submit" className="btn btn-primary ms-2" disabled={isSubmitting}>
						Update Portal URL
					</button>
				</div>
			</form>
		</div>
	)
}
