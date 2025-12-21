"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { getCurrentUser, login as djangoLogin, logout as djangoLogout } from "./django-auth"
import { DjangoUser } from "@repo/domain/types"

interface AuthContextType {
	user: DjangoUser | null
	isLoading: boolean
	isAuthenticated: boolean
	login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
	logout: () => Promise<void>
	refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<DjangoUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const refreshUser = useCallback(async () => {
		try {
			const currentUser = await getCurrentUser()
			setUser(currentUser)
		} catch (error) {
			console.error("Failed to refresh user:", error)
			setUser(null)
		}
	}, [])

	// Check auth status on mount
	useEffect(() => {
		const checkAuth = async () => {
			setIsLoading(true)
			try {
				const currentUser = await getCurrentUser()
				setUser(currentUser)
			} catch (error) {
				console.error("Auth check failed:", error)
				setUser(null)
			} finally {
				setIsLoading(false)
			}
		}

		void checkAuth()
	}, [])

	const login = useCallback(async (email: string, password: string) => {
		const result = await djangoLogin(email, password)
		if (result.success === false) {
			return { success: false, error: result.error }
		}
		setUser(result.user)
		return { success: true }
	}, [])

	const logout = useCallback(async () => {
		await djangoLogout()
		setUser(null)
	}, [])

	const value = useMemo(
		() => ({
			user,
			isLoading,
			isAuthenticated: user !== null,
			login,
			logout,
			refreshUser,
		}),
		[user, isLoading, login, logout, refreshUser],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return context
}
