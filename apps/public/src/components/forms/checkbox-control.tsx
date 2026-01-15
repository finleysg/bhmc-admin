import { InputHTMLAttributes } from "react"

import { FieldValues, Path, UseFormRegisterReturn } from "react-hook-form"

import { Checkbox } from "./checkbox"

type CheckboxControlProps<TData extends FieldValues> = {
	name: string
	label: string
	register: UseFormRegisterReturn<Path<TData>>
} & InputHTMLAttributes<HTMLInputElement>

export function CheckboxControl<TData extends FieldValues>(props: CheckboxControlProps<TData>) {
	const { name, label, register, ...rest } = props

	return <Checkbox id={name} label={label} {...register} {...rest} />
}
