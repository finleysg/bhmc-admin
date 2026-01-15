import { Route, Routes } from "react-router-dom"
import { ToastContainer } from "react-toastify"

import { ActivateAccountScreen } from "../screens/session/activate-account"
import { ConfirmAccountScreen } from "../screens/session/confirm-account"
import { LoginScreen } from "../screens/session/login"
import { MaintenanceScreen } from "../screens/maintenance"
import { NotFoundScreen } from "../screens/not-found"
import { RegisterAccountScreen } from "../screens/session/register-account"
import { ResetPasswordScreen } from "../screens/session/reset-password"
import { ResetPasswordCompleteScreen } from "../screens/session/reset-password-complete"
import { ResetPasswordRequestScreen } from "../screens/session/reset-password-request"
import { ResetPasswordSentScreen } from "../screens/session/reset-password-sent"
import * as config from "../utils/app-config"
import { AuthHeader } from "./auth-header"

function SessionRoutes() {
	if (config.maintenanceMode) {
		return (
			<Routes>
				<Route path="*" element={<MaintenanceScreen />} />
			</Routes>
		)
	}
	return (
		<Routes>
			<Route path="/login" element={<LoginScreen />} />
			<Route path="/account" element={<RegisterAccountScreen />} />
			<Route path="/account/confirm" element={<ConfirmAccountScreen />} />
			<Route path="/account/activate/:uid/:token" element={<ActivateAccountScreen />} />
			<Route path="/reset-password" element={<ResetPasswordRequestScreen />} />
			<Route path="/reset-password/sent" element={<ResetPasswordSentScreen />} />
			<Route path="/reset-password/:uid/:token" element={<ResetPasswordScreen />} />
			<Route path="/reset-password/complete" element={<ResetPasswordCompleteScreen />} />
			<Route path="*" element={<NotFoundScreen />} />
		</Routes>
	)
}

function AuthLayout() {
	return (
		<div className="session">
			<ToastContainer />
			<AuthHeader />
			<SessionRoutes />
		</div>
	)
}

export default AuthLayout
