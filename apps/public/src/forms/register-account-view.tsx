import { UseFormReturn } from "react-hook-form"

import { InputControl } from "../components/forms/input-control"
import { Spinner } from "../components/spinners/spinner"
import { RegisterData } from "../models/auth"

interface IRegisterAccountView {
	form: UseFormReturn<RegisterData>
	onSubmit: (args: RegisterData) => void
}

export function RegisterAccountView({ form, onSubmit }: IRegisterAccountView) {
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	return (
		<form onSubmit={handleSubmit(onSubmit)}>
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
			<InputControl
				name="password"
				type="password"
				label="Password"
				register={register("password")}
				error={formErrors.password}
			/>
			<InputControl
				name="re_password"
				type="password"
				label="Confirm password"
				register={register("re_password")}
				error={formErrors.re_password}
			/>
			<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
				Create Account
			</button>
			{isSubmitting && <Spinner />}
		</form>
	)
}
