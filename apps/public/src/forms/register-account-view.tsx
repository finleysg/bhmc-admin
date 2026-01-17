import { FormEvent } from "react"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { RegisterData } from "../models/auth"

interface RegisterAccountViewProps {
	formData: RegisterData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof RegisterData, value: string) => void
	onSubmit: (e: FormEvent) => void
}

export function RegisterAccountView({
	formData,
	errors,
	isSubmitting,
	onChange,
	onSubmit,
}: RegisterAccountViewProps) {
	return (
		<form onSubmit={onSubmit}>
			<InputControl
				name="first_name"
				type="text"
				label="First name"
				value={formData.first_name}
				onChange={(e) => onChange("first_name", e.target.value)}
				error={errors.first_name}
			/>
			<InputControl
				name="last_name"
				type="text"
				label="Last name"
				value={formData.last_name}
				onChange={(e) => onChange("last_name", e.target.value)}
				error={errors.last_name}
			/>
			<InputControl
				name="email"
				type="text"
				label="Email"
				value={formData.email}
				onChange={(e) => onChange("email", e.target.value)}
				error={errors.email}
			/>
			<InputControl
				name="ghin"
				type="text"
				label="GHIN"
				value={formData.ghin}
				onChange={(e) => onChange("ghin", e.target.value)}
				error={errors.ghin}
			/>
			<InputControl
				name="password"
				type="password"
				label="Password"
				value={formData.password}
				onChange={(e) => onChange("password", e.target.value)}
				error={errors.password}
			/>
			<InputControl
				name="re_password"
				type="password"
				label="Confirm password"
				value={formData.re_password}
				onChange={(e) => onChange("re_password", e.target.value)}
				error={errors.re_password}
			/>
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Create Account
			</button>
			{isSubmitting && <Spinner />}
		</form>
	)
}
