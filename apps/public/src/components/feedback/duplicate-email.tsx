import { HtmlHTMLAttributes } from "react"

import { Link } from "react-router-dom"

export function DuplicateEmail(props: HtmlHTMLAttributes<HTMLDivElement>) {
	return (
		<div role="alert" className="mt-3" {...props}>
			<span className="text-danger">
				We already have an account with that email. Do you need to{" "}
				<Link to="/session/reset-password">reset your password</Link>?
			</span>
		</div>
	)
}
