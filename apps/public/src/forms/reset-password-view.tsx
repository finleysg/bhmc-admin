import { UseFormReturn } from "react-hook-form"

import { InputControl } from "../components/forms/input-control"
import { ResetPasswordData } from "../models/auth"

interface IResetPasswordView {
	form: UseFormReturn<ResetPasswordData>
	onSubmit: (args: ResetPasswordData) => void
}

export function ResetPasswordView({ form, onSubmit }: IResetPasswordView) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<InputControl
				name="new_password"
				label="Password"
				register={register("new_password")}
				error={formErrors.new_password}
				type="password"
			/>
			<InputControl
				name="re_new_password"
				label="Confirm Password"
				register={register("re_new_password")}
				error={formErrors.re_new_password}
				type="password"
			/>
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Reset Password
			</button>
		</form>
	)
}
