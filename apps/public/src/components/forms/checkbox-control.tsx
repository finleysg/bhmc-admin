import { InputHTMLAttributes } from "react"

import { Checkbox } from "./checkbox"

type CheckboxControlProps = {
	name: string
	label: string
} & InputHTMLAttributes<HTMLInputElement>

export function CheckboxControl(props: CheckboxControlProps) {
	const { name, label, ...rest } = props

	return <Checkbox id={name} label={label} {...rest} />
}
