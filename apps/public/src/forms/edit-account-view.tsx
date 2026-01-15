import { UseFormReturn } from "react-hook-form"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { PlayerApiData } from "../models/player"

interface EditAccountViewProps {
	form: UseFormReturn<PlayerApiData>
	onCancel: () => void
	onSubmit: (args: PlayerApiData) => void
}

export function EditAccountView({ form, onCancel, onSubmit }: EditAccountViewProps) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	const submitForm = (args: PlayerApiData) => {
		onSubmit(args)
	}

	return (
		<form onSubmit={handleSubmit(submitForm)}>
			<InputControl
				name="first_name"
				type="text"
				label="First name"
				register={register("first_name")}
				error={formErrors.first_name}
			/>
			<InputControl
				name="last_name"
				type="text"
				label="Last name"
				register={register("last_name")}
				error={formErrors.last_name}
			/>
			<InputControl
				name="email"
				type="email"
				label="Email"
				register={register("email")}
				error={formErrors.email}
			/>
			<InputControl
				name="ghin"
				type="text"
				label="GHIN"
				register={register("ghin")}
				error={formErrors.ghin}
			/>
			<InputControl
				name="birth_date"
				type="date"
				label="Birthday"
				register={register("birth_date")}
				error={formErrors.birth_date}
			/>
			<InputControl
				name="phone_number"
				type="text"
				label="Phone number"
				register={register("phone_number")}
				error={formErrors.phone_number}
			/>
			<button type="submit" className="btn btn-primary btn-sm me-2" disabled={false}>
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
