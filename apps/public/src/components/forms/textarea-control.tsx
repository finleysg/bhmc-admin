import { TextareaHTMLAttributes } from "react"

import { FieldError, FieldValues, Path, UseFormRegisterReturn } from "react-hook-form"

type TextareaControlProps<TData extends FieldValues> = {
	name: string
	label?: string
	error?: FieldError
	register: UseFormRegisterReturn<Path<TData>>
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextareaControl<TData extends FieldValues>(props: TextareaControlProps<TData>) {
	const { name, label, error, register, ...rest } = props

	return (
		<div className="form-group">
			{label && <label htmlFor={name}>{label}</label>}
			<textarea
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
