import { MdAccountCircle } from "react-icons/md"
import { Link } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"

export function ResetPasswordSentScreen() {
	const { user } = useAuth()

	if (!user) {
		return null // or a loading spinner
	}
	return (
		<div className="login">
			<div className="login__block active">
				<div className="login__header bg-primary">
					<i>
						<MdAccountCircle />
					</i>
					Check Your Email
				</div>

				<div className="login__body">
					<h3>You&apos;re Almost Done...</h3>
					<p>
						A password reset email has been sent to: <strong>{user?.email}</strong>.
					</p>
					<p>
						If you don&apos;t receive a reset link within a few minutes, check to ensure that your
						email client is not routing email from bhmc.org to junk or spam. If we don&apos;t have
						an account record with this email, that would be another reason you might not receive a
						reset link. In that case, please <Link to="/session/account">create an account</Link>.
					</p>
				</div>
			</div>
		</div>
	)
}
