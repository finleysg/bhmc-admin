import { FormEvent, useEffect, useState } from "react"

import { useNavigate } from "react-router-dom"

import { DuplicateEmail } from "../components/feedback/duplicate-email"
import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { RegisterAccountSchema, RegisterData } from "../models/auth"
import { formatZodErrors } from "../utils/form-utils"
import { RegisterAccountView } from "./register-account-view"

const defaultFormData: RegisterData = {
	first_name: "",
	last_name: "",
	email: "",
	ghin: "",
	password: "",
	re_password: "",
}

export function RegisterAccountHandler() {
	const {
		register: { mutate, isError, error, reset },
	} = useAuth()
	const navigate = useNavigate()

	const [formData, setFormData] = useState<RegisterData>(defaultFormData)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		return () => reset()
	}, [reset])

	const isDuplicate = isError && (error?.message?.indexOf("user already exists") ?? -1) >= 0

	const handleChange = (field: keyof RegisterData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = RegisterAccountSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		mutate(result.data, {
			onSuccess: () => navigate("/session/account/confirm"),
			onSettled: () => setIsSubmitting(false),
		})
	}

	return (
		<div>
			<RegisterAccountView
				formData={formData}
				errors={errors}
				isSubmitting={isSubmitting}
				onChange={handleChange}
				onSubmit={handleSubmit}
			/>
			{isDuplicate && <DuplicateEmail />}
			{isError && !isDuplicate && (
				<ErrorDisplay error={error?.message ?? "Registration error"} delay={3000} />
			)}
		</div>
	)
}
