import { TextareaHTMLAttributes } from "react"

type TextareaControlProps = {
	name: string
	label?: string
	error?: string
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextareaControl(props: TextareaControlProps) {
	const { name, label, error, ...rest } = props

	return (
		<div className="form-group">
			{label && <label htmlFor={name}>{label}</label>}
			<textarea
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
