import { UseFormReturn } from "react-hook-form"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { GuestPlayerData } from "../models/player"

interface IAddPlayerView {
	form: UseFormReturn<GuestPlayerData>
	onCancel: () => void
	onSubmit: (args: GuestPlayerData) => void
}

export function AddPlayerView({ form, onCancel, onSubmit }: IAddPlayerView) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	return (
		<form onSubmit={handleSubmit(onSubmit)} style={{ marginBottom: "1rem" }}>
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
				type="text"
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
