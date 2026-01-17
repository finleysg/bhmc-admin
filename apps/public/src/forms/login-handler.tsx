import { FormEvent, useState } from "react"

import { useNavigate, useSearchParams } from "react-router-dom"

import { ErrorDisplay } from "../components/feedback/error-display"
import { useAuth } from "../hooks/use-auth"
import { LoginData, LoginSchema } from "../models/auth"
import { formatZodErrors } from "../utils/form-utils"
import { LoginView } from "./login-view"

export function LoginHandler() {
	const [searchParams] = useSearchParams()
	const {
		login: { mutate, error },
	} = useAuth()
	const navigate = useNavigate()

	const [formData, setFormData] = useState<LoginData>({ email: "", password: "" })
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (field: keyof LoginData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = LoginSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		mutate(result.data, {
			onSuccess: () => {
				navigate(searchParams.get("redirectUrl") ?? "/home")
			},
			onSettled: () => setIsSubmitting(false),
		})
	}

	return (
		<div>
			<LoginView
				formData={formData}
				errors={errors}
				isSubmitting={isSubmitting}
				onChange={handleChange}
				onSubmit={handleSubmit}
			/>
			{error && <ErrorDisplay error={error.message} delay={3000} />}
			<hr />
			<div className="flex">
				<button className="btn btn-link" onClick={() => navigate("/session/reset-password")}>
					Forgot My Password
				</button>
			</div>
		</div>
	)
}
