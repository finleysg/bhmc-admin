import { MdAccountCircle } from "react-icons/md"

import { useAuth } from "../../hooks/use-auth"

export function ConfirmAccountScreen() {
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
					Confirm Your Email
				</div>

				<div className="login__body">
					<h3>You&apos;re Almost Done...</h3>
					<p>
						A verification email was sent to: <strong>{user?.email}</strong>.
					</p>
					<p>
						Open this email and click the link to activate your account. If you did not receive this
						email, please check your spam and/or junk email folder. You need to allow emails from
						postmaster@bhmc.org.
					</p>
				</div>
			</div>
		</div>
	)
}
