import { FormEvent, useState } from "react"

import { z } from "zod"

import { formatZodErrors } from "../../utils/form-utils"
import { InputControl } from "../forms/input-control"

const EventPortalSchema = z.object({
	portal_url: z.string().url("Copy and paste the portal url here."),
})
type EventPortalData = z.infer<typeof EventPortalSchema>

interface EventPortalFormProps {
	onSubmit: (url: string) => void
}

export function EventPortalForm({ onSubmit }: EventPortalFormProps) {
	const [formData, setFormData] = useState<EventPortalData>({ portal_url: "" })
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (field: keyof EventPortalData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = EventPortalSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		onSubmit(result.data.portal_url)
		setFormData({ portal_url: "" })
		setIsSubmitting(false)
	}

	return (
		<div>
			<form onSubmit={handleSubmit}>
				<InputControl
					name="portal_url"
					label="Portal Url"
					type="text"
					value={formData.portal_url}
					onChange={(e) => handleChange("portal_url", e.target.value)}
					error={errors.portal_url}
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
