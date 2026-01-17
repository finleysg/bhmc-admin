import { FormEvent } from "react"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { GuestPlayerData } from "../models/player"

interface AddPlayerViewProps {
	formData: GuestPlayerData
	errors: Record<string, string>
	isSubmitting: boolean
	onChange: (field: keyof GuestPlayerData, value: string) => void
	onSubmit: (e: FormEvent) => void
	onCancel: () => void
}

export function AddPlayerView({
	formData,
	errors,
	isSubmitting,
	onChange,
	onSubmit,
	onCancel,
}: AddPlayerViewProps) {
	return (
		<form onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
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
			<button type="submit" className="btn btn-primary me-2" disabled={isSubmitting}>
				Create Player
			</button>
			<button type="reset" className="btn btn-light" disabled={isSubmitting} onClick={onCancel}>
				Cancel
			</button>
			{isSubmitting && <Spinner />}
		</form>
	)
}
