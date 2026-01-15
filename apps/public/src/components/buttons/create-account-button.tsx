import { Link } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"
import { CustomLinkProps } from "./login-button"

export function CreateAccountButton(props: CustomLinkProps) {
	const { user } = useAuth()

	if (!user.isAuthenticated) {
		return (
			<Link className="btn btn-primary btn-sm me-2" to="/session/account" {...props}>
				Sign Up For an Account
			</Link>
		)
	}
}
