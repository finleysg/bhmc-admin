import { FormEvent } from "react"

import { InputControl } from "../components/forms/input-control"
import { RequestPasswordData } from "../models/auth"

interface RequestPasswordResetViewProps {
	formData: RequestPasswordData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof RequestPasswordData, value: string) => void
	onSubmit: (e: FormEvent) => void
}

export function RequestPasswordResetView({
	formData,
	errors,
	isSubmitting,
	onChange,
	onSubmit,
}: RequestPasswordResetViewProps) {
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
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Request Password Reset
			</button>
		</form>
	)
}
