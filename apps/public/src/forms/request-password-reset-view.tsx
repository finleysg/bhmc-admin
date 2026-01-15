import { UseFormReturn } from "react-hook-form"

import { InputControl } from "../components/forms/input-control"
import { RequestPasswordData } from "../models/auth"

interface IRequestPasswordReset {
	form: UseFormReturn<RequestPasswordData>
	onSubmit: (args: RequestPasswordData) => void
}

export function RequestPasswordResetView({ form, onSubmit }: IRequestPasswordReset) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<InputControl
				name="email"
				label="Email"
				register={register("email")}
				error={formErrors.email}
				type="text"
			/>
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Request Password Reset
			</button>
		</form>
	)
}
