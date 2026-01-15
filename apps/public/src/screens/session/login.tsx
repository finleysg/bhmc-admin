import { MdAccountCircle } from "react-icons/md"

import { LoginHandler } from "../../forms/login-handler"
import { Home } from "../../layout/home"

export function LoginScreen() {
	return (
		<div className="login">
			<div className="login__block active">
				<div className="login__header bg-primary">
					<i>
						<MdAccountCircle />
					</i>
					Sign In to Your Account
					<Home />
				</div>

				<div className="login__body">
					<LoginHandler />
				</div>
			</div>
		</div>
	)
}
