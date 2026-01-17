import { FormEvent } from "react"

import { InputControl } from "../components/forms/input-control"
import { LoginData } from "../models/auth"

interface LoginViewProps {
	formData: LoginData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof LoginData, value: string) => void
	onSubmit: (e: FormEvent) => void
}

export function LoginView({ formData, errors, isSubmitting, onChange, onSubmit }: LoginViewProps) {
	return (
		<form onSubmit={onSubmit}>
			<InputControl
				name="email"
				label="Email"
				type="text"
				value={formData.email}
				onChange={(e) => onChange("email", e.target.value)}
				error={errors.email}
			/>
			<InputControl
				name="password"
				label="Password"
				type="password"
				value={formData.password}
				onChange={(e) => onChange("password", e.target.value)}
				error={errors.password}
			/>
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Log In
			</button>
		</form>
	)
}
