import { InputHTMLAttributes } from "react"

import { FieldError, FieldValues, Path, UseFormRegisterReturn } from "react-hook-form"

type InputControlProps<TData extends FieldValues> = {
	name: string
	label?: string
	error?: FieldError
	register: UseFormRegisterReturn<Path<TData>>
} & InputHTMLAttributes<HTMLInputElement>

export function InputControl<TData extends FieldValues>(props: InputControlProps<TData>) {
	const { name, label, error, register, ...rest } = props

	return (
		<div className="form-group mb-2">
			{label && <label htmlFor={name}>{label}</label>}
			<input
				id={name}
				className={`form-control ${error ? "is-invalid" : ""}`}
				aria-invalid={Boolean(error)}
				{...register}
				{...rest}
			/>
			<i className="form-group__bar"></i>
			{error && (
				<div className="invalid-feedback" aria-errormessage={error.message}>
					{error.message}
				</div>
			)}
		</div>
	)
}
