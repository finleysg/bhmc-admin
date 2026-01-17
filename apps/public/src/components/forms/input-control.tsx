import { InputHTMLAttributes } from "react"

type InputControlProps = {
	name: string
	label?: string
	error?: string
} & InputHTMLAttributes<HTMLInputElement>

export function InputControl(props: InputControlProps) {
	const { name, label, error, ...rest } = props

	return (
		<div className="form-group mb-2">
			{label && <label htmlFor={name}>{label}</label>}
			<input
				id={name}
				name={name}
				className={`form-control ${error ? "is-invalid" : ""}`}
				aria-invalid={Boolean(error)}
				{...rest}
			/>
			<i className="form-group__bar"></i>
			{error && (
				<div className="invalid-feedback" aria-errormessage={error}>
					{error}
				</div>
			)}
		</div>
	)
}
