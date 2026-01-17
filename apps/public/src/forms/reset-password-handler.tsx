import { FormEvent, useState } from "react"

import { useNavigate, useParams } from "react-router-dom"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { ResetPasswordData, ResetPasswordSchema } from "../models/auth"
import { formatZodErrors } from "../utils/form-utils"
import { ResetPasswordView } from "./reset-password-view"

const defaultFormData: ResetPasswordData = {
	new_password: "",
	re_new_password: "",
}

export function ResetPasswordHandler() {
	const { uid, token } = useParams()
	const {
		resetPassword: { mutate, error },
	} = useAuth()
	const navigate = useNavigate()

	const [formData, setFormData] = useState<ResetPasswordData>(defaultFormData)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (field: keyof ResetPasswordData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = ResetPasswordSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		if (uid && token) {
			const finalArgs = { ...result.data, uid, token }
			setIsSubmitting(true)
			mutate(finalArgs, {
				onSuccess: () => navigate("/session/reset-password/complete"),
				onSettled: () => setIsSubmitting(false),
			})
		} else {
			console.error("Inconceivable! Not uid or token params available.")
		}
	}

	return (
		<div>
			<ResetPasswordView
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
