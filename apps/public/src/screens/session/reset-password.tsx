import { MdAccountCircle } from "react-icons/md"

import { ResetPasswordHandler } from "../../forms/reset-password-handler"

export function ResetPasswordScreen() {
	return (
		<div className="login">
			<div className="login__block active">
				<div className="login__header bg-primary">
					<i>
						<MdAccountCircle />
					</i>
					Create a New Password
				</div>

				<div className="login__body">
					<ResetPasswordHandler />
				</div>
			</div>
		</div>
	)
}
