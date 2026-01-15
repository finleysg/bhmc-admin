import { ComponentPropsWithoutRef } from "react"

import { GiCheckMark } from "react-icons/gi"

export interface CheckboxProps extends ComponentPropsWithoutRef<"input"> {
	label?: string
}

export function Checkbox({ label, ...rest }: CheckboxProps) {
	return (
		<label className="my-checkbox">
			<span className="checkbox__input">
				<input type="checkbox" {...rest} />
				<span className="checkbox__control">
					<GiCheckMark />
				</span>
			</span>
			{Boolean(label) && <span className="checkbox__text">{label}</span>}
		</label>
	)
}
