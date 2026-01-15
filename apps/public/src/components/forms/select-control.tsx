import { ComponentPropsWithoutRef } from "react"

import { FieldError, FieldValues, Path, UseFormRegisterReturn } from "react-hook-form"

export interface SelectOption {
	name: string
	value: string | number
}

interface SelectControlProps<TData extends FieldValues> extends ComponentPropsWithoutRef<"select"> {
	name: string
	label?: string
	options: SelectOption[]
	error?: FieldError
	register: UseFormRegisterReturn<Path<TData>>
}

export function SelectControl<TData extends FieldValues>(props: SelectControlProps<TData>) {
	const { name, label, error, register, options, ...rest } = props

	return (
		<div className="form-group mb-2">
			{label && <label htmlFor={name}>{label}</label>}
			<select
				{...register}
				{...rest}
				id={name}
				className="form-control"
				aria-invalid={Boolean(error)}
			>
				<option key={0} value={""}>
					-- Select --
				</option>
				{options.map((opt) => {
					return (
						<option key={opt.value} value={opt.value}>
							{opt.name}
						</option>
					)
				})}
			</select>
			<i className="form-group__bar"></i>
			{error && (
				<div className="invalid-feedback" aria-errormessage={error.message}>
					{error.message as string}
				</div>
			)}
		</div>
	)
}
