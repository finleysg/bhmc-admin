import { createContext } from "react"

import { UseMutationResult } from "@tanstack/react-query"

import {
	ActivateData,
	ChangePasswordData,
	LoginData,
	RegisterData,
	RequestPasswordData,
	ResetPasswordData,
	User,
} from "../models/auth"
import { NewUser } from "./authentication"

interface IAuthState {
	user: User
	login: UseMutationResult<void, Error, LoginData, unknown>
	logout: UseMutationResult<void, Error, void, unknown>
	register: UseMutationResult<NewUser, Error, RegisterData, unknown>
	activate: UseMutationResult<void, Error, ActivateData, unknown>
	requestPasswordReset: UseMutationResult<void, Error, RequestPasswordData, unknown>
	resetPassword: UseMutationResult<void, Error, ResetPasswordData, unknown>
	changePassword: UseMutationResult<void, Error, ChangePasswordData, unknown>
}

export const AuthContext = createContext<IAuthState | null>(null)
AuthContext.displayName = "AuthContext"
