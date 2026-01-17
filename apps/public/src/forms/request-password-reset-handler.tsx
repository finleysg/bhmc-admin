import { FormEvent, useState } from "react"

import { useNavigate } from "react-router-dom"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { RequestPasswordData, RequestPasswordSchema } from "../models/auth"
import { formatZodErrors } from "../utils/form-utils"
import { RequestPasswordResetView } from "./request-password-reset-view"

const defaultFormData: RequestPasswordData = {
	email: "",
}

export function RequestPasswordResetHandler() {
	const {
		requestPasswordReset: { mutate, error },
	} = useAuth()
	const navigate = useNavigate()

	const [formData, setFormData] = useState<RequestPasswordData>(defaultFormData)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (field: keyof RequestPasswordData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = RequestPasswordSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		mutate(result.data, {
			onSuccess: () => navigate("/session/reset-password/sent"),
			onSettled: () => setIsSubmitting(false),
		})
	}

	return (
		<div>
			<RequestPasswordResetView
				formData={formData}
				errors={errors}
				isSubmitting={isSubmitting}
				onChange={handleChange}
				onSubmit={handleSubmit}
			/>
			{error && <ErrorDisplay error={error.message} delay={3000} />}
		</div>
	)
}
