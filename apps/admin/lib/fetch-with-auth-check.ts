"use client"

import { useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "./auth-context"

/**
 * Fetch wrapper that handles 401 by logging out and redirecting to sign-in.
 * Preserves current path as returnUrl for post-auth redirect.
 */
export function useAuthFetch() {
	const { logout } = useAuth()
	const router = useRouter()
	const pathname = usePathname()

	return useCallback(
		async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			const response = await fetch(input, init)
			if (response.status === 401) {
				await logout()
				router.push(`/sign-in?returnUrl=${encodeURIComponent(pathname)}`)
			}
			return response
		},
		[logout, router, pathname],
	)
}

/**
 * Check existing response for 401 and handle logout/redirect.
 * Returns true if 401 was detected (caller should return early).
 */
export function useHandle401() {
	const { logout } = useAuth()
	const router = useRouter()
	const pathname = usePathname()

	return useCallback(
		async (response: Response): Promise<boolean> => {
			if (response.status === 401) {
				await logout()
				router.push(`/sign-in?returnUrl=${encodeURIComponent(pathname)}`)
				return true
			}
			return false
		},
		[logout, router, pathname],
	)
}
