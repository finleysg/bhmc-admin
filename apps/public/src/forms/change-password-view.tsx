import { UseFormReturn } from "react-hook-form"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { ChangePasswordData } from "../models/auth"

interface IChangePasswordView {
	form: UseFormReturn<ChangePasswordData>
	onCancel: () => void
	onSubmit: (args: ChangePasswordData) => void
}

export function ChangePasswordView({ form, onCancel, onSubmit }: IChangePasswordView) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
			<InputControl
				name="current_password"
				label="Current password"
				register={register("current_password")}
				error={formErrors.current_password}
				type="password"
			/>
			<InputControl
				name="new_password"
				label="New password"
				register={register("new_password")}
				error={formErrors.new_password}
				type="password"
			/>
			<InputControl
				name="re_new_password"
				label="Confirm new password"
				register={register("re_new_password")}
				error={formErrors.re_new_password}
				type="password"
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
