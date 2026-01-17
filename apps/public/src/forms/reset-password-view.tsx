import { FormEvent } from "react"

import { InputControl } from "../components/forms/input-control"
import { ResetPasswordData } from "../models/auth"

interface ResetPasswordViewProps {
	formData: ResetPasswordData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof ResetPasswordData, value: string) => void
	onSubmit: (e: FormEvent) => void
}

export function ResetPasswordView({
	formData,
	errors,
	isSubmitting,
	onChange,
	onSubmit,
}: ResetPasswordViewProps) {
	return (
		<form onSubmit={onSubmit}>
			<InputControl
				name="new_password"
				label="Password"
				type="password"
				value={formData.new_password}
				onChange={(e) => onChange("new_password", e.target.value)}
				error={errors.new_password}
			/>
			<InputControl
				name="re_new_password"
				label="Confirm Password"
				type="password"
				value={formData.re_new_password}
				onChange={(e) => onChange("re_new_password", e.target.value)}
				error={errors.re_new_password}
			/>
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Reset Password
			</button>
		</form>
	)
}
