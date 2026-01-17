import { FormEvent, useState } from "react"

import { toast } from "react-toastify"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { ChangePasswordData, ChangePasswordSchema } from "../models/auth"
import { formatZodErrors } from "../utils/form-utils"
import { ChangePasswordView } from "./change-password-view"

interface ChangePasswordHandlerProps {
	onClose: () => void
}

const defaultFormData: ChangePasswordData = {
	current_password: "",
	new_password: "",
	re_new_password: "",
}

export function ChangePasswordHandler({ onClose }: ChangePasswordHandlerProps) {
	const {
		changePassword: { mutate, error },
	} = useAuth()

	const [formData, setFormData] = useState<ChangePasswordData>(defaultFormData)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (field: keyof ChangePasswordData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = ChangePasswordSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		mutate(result.data, {
			onSuccess: () => {
				toast.success("👍 Your password has been changed")
				onClose()
			},
			onSettled: () => setIsSubmitting(false),
		})
	}

	return (
		<div>
			<ChangePasswordView
				formData={formData}
				errors={errors}
				isSubmitting={isSubmitting}
				onChange={handleChange}
				onSubmit={handleSubmit}
				onCancel={onClose}
			/>
			{error && <ErrorDisplay error={error.message} delay={3000} />}
		</div>
	)
}
