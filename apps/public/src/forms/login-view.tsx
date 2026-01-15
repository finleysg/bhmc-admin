import { UseFormReturn } from "react-hook-form"

import { InputControl } from "../components/forms/input-control"
import { LoginData } from "../models/auth"

interface ILoginView {
	form: UseFormReturn<LoginData>
	onSubmit: (args: LoginData) => void
}

export function LoginView({ form, onSubmit }: ILoginView) {
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
			<InputControl
				name="password"
				label="Password"
				register={register("password")}
				error={formErrors.password}
				type="password"
			/>
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Log In
			</button>
		</form>
	)
}
