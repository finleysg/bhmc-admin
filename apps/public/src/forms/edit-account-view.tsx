import { FormEvent } from "react"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { PlayerApiData } from "../models/player"

type EditAccountData = Omit<PlayerApiData, "profile_picture">

interface EditAccountViewProps {
	formData: EditAccountData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof EditAccountData, value: string) => void
	onSubmit: (e: FormEvent) => void
	onCancel: () => void
}

export function EditAccountView({
	formData,
	errors,
	isSubmitting,
	onChange,
	onSubmit,
	onCancel,
}: EditAccountViewProps) {
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
				type="email"
				label="Email"
				value={formData.email ?? ""}
				onChange={(e) => onChange("email", e.target.value)}
				error={errors.email}
			/>
			<InputControl
				name="ghin"
				type="text"
				label="GHIN"
				value={formData.ghin ?? ""}
				onChange={(e) => onChange("ghin", e.target.value)}
				error={errors.ghin}
			/>
			<InputControl
				name="birth_date"
				type="date"
				label="Birthday"
				value={formData.birth_date ?? ""}
				onChange={(e) => onChange("birth_date", e.target.value)}
				error={errors.birth_date}
			/>
			<InputControl
				name="phone_number"
				type="text"
				label="Phone number"
				value={formData.phone_number ?? ""}
				onChange={(e) => onChange("phone_number", e.target.value)}
				error={errors.phone_number}
			/>
			<button type="submit" className="btn btn-primary btn-sm me-2" disabled={isSubmitting}>
				Save Changes
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
