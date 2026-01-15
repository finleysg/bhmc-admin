import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
	ActivateData,
	ChangePasswordData,
	LoginData,
	RegisterData,
	RequestPasswordData,
	ResetPasswordData,
	User,
	UserApiSchema,
} from "../models/auth"
import { PlayerApiSchema } from "../models/player"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"
import { IAuthenticationProvider } from "./authentication"
import { AuthContext } from "./auth-context"

interface IAuthProvider {
	authenticationProvider: IAuthenticationProvider
}

const placeholderUser = new User({
	first_name: "unknown",
	last_name: "unknown",
	email: "unknown",
})

export function AuthProvider({
	children,
	authenticationProvider,
}: PropsWithChildren<IAuthProvider>) {
	const [user, setUser] = useState(placeholderUser)
	const queryClient = useQueryClient()

	const loadUser = useCallback(async () => {
		try {
			const currentUser = await authenticationProvider.getUser()
			const endpoint = apiUrl(
				`players/?email=${encodeURIComponent(currentUser.email ?? "missing")}`,
			)
			const players = await httpClient(endpoint)
			if (players?.length === 1 && players[0] !== null) {
				const playerData = PlayerApiSchema.parse(players[0])
				queryClient.setQueryData(["player"], playerData)
			}
			setUser(currentUser)
			return currentUser
		} catch (err) {
			setUser(new User(null))
		}
	}, [authenticationProvider, queryClient])

	useEffect(() => {
		loadUser()
	}, [loadUser])

	const login = useMutation({
		mutationFn: (args: LoginData) => authenticationProvider.login(args),
		onSuccess: () => {
			loadUser()
		},
	})

	const logout = useMutation({
		mutationFn: () => authenticationProvider.logout(),
		onSettled: () => {
			queryClient.clear()
			setUser(new User(null))
		},
	})

	const register = useMutation({
		mutationFn: (args: RegisterData) => authenticationProvider.register(args),
		onSuccess: (data) => {
			const userData = UserApiSchema.parse(data)
			const newUser = new User(userData)
			setUser(newUser)
			return newUser
		},
	})

	const activate = useMutation({
		mutationFn: (args: ActivateData) => authenticationProvider.activate(args),
	})

	const requestPasswordReset = useMutation({
		mutationFn: (args: RequestPasswordData) => authenticationProvider.requestPasswordReset(args),
		onSuccess: (_, args) => {
			const currentUser = new User(null)
			currentUser.email = args.email
			setUser(currentUser)
		}, // anonymous user, but set the email for UI display
	})

	const resetPassword = useMutation({
		mutationFn: (args: ResetPasswordData) => authenticationProvider.resetPassword(args),
	})

	const changePassword = useMutation({
		mutationFn: (args: ChangePasswordData) => authenticationProvider.changePassword(args),
	})

	const value = useMemo(() => {
		return {
			user,
			login,
			logout,
			register,
			activate,
			requestPasswordReset,
			resetPassword,
			changePassword,
		}
	}, [login, logout, register, activate, requestPasswordReset, resetPassword, changePassword, user])

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
