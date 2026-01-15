/* eslint-disable @typescript-eslint/no-unused-vars */
import { IAuthenticationProvider, NewUser } from "../context/authentication"
import {
	ActivateData,
	ChangePasswordData,
	LoginData,
	RegisterData,
	RequestPasswordData,
	ResetPasswordData,
	User,
} from "../models/auth"

export class TestAuthenticationProvider implements IAuthenticationProvider {
	_user?: User

	constructor(user?: User) {
		this._user = user
	}

	getUser = () => Promise.resolve(this._user ?? new User(null))
	login = (_: LoginData) => Promise.resolve()
	logout = () => Promise.resolve()
	register = (_: RegisterData) => Promise.resolve({} as NewUser)
	activate = (_: ActivateData) => Promise.resolve()
	requestPasswordReset = (_: RequestPasswordData) => Promise.resolve()
	resetPassword = (_: ResetPasswordData) => Promise.resolve()
	changePassword = (_: ChangePasswordData) => Promise.resolve()
}
