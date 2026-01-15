import { MdAccountCircle } from "react-icons/md"

import { RegisterAccountHandler } from "../../forms/register-account-handler"
import { Home } from "../../layout/home"

export function RegisterAccountScreen() {
	return (
		<div className="login">
			<div className="login__block active">
				<div className="login__header bg-primary">
					<i>
						<MdAccountCircle />
					</i>
					Create an Account
					<Home />
				</div>
				<div className="login__body">
					<RegisterAccountHandler />
				</div>
			</div>
		</div>
	)
}
