import { FormEvent } from "react"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { ChangePasswordData } from "../models/auth"

interface ChangePasswordViewProps {
	formData: ChangePasswordData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof ChangePasswordData, value: string) => void
	onSubmit: (e: FormEvent) => void
	onCancel: () => void
}

export function ChangePasswordView({
	formData,
	errors,
	isSubmitting,
	onChange,
	onSubmit,
	onCancel,
}: ChangePasswordViewProps) {
	return (
		<form onSubmit={onSubmit}>
			<InputControl
				name="current_password"
				label="Current password"
				type="password"
				value={formData.current_password}
				onChange={(e) => onChange("current_password", e.target.value)}
				error={errors.current_password}
			/>
			<InputControl
				name="new_password"
				label="New password"
				type="password"
				value={formData.new_password}
				onChange={(e) => onChange("new_password", e.target.value)}
				error={errors.new_password}
			/>
			<InputControl
				name="re_new_password"
				label="Confirm new password"
				type="password"
				value={formData.re_new_password}
				onChange={(e) => onChange("re_new_password", e.target.value)}
				error={errors.re_new_password}
			/>
			<button type="submit" className="btn btn-primary btn-sm me-2" disabled={isSubmitting}>
				Change Password
			</button>
			<button
				type="reset"
				className="btn btn-light btn-sm"
				disabled={isSubmitting}
				onClick={onCancel}
			>
				Cancel
			</button>
			{isSubmitting && <Spinner />}
		</form>
	)
}
