"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

import { useAuth } from "../../lib/auth-context"

const UNGUARDED_ROUTES = ["/sign-in", "/restricted"]

export function SuperuserGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isSuperuser, isLoading } = useAuth()
	const router = useRouter()
	const pathname = usePathname()

	const isUnguarded = UNGUARDED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	)

	useEffect(() => {
		if (isLoading || isUnguarded) return
		if (isAuthenticated && !isSuperuser) {
			router.replace("/restricted")
		}
	}, [isAuthenticated, isSuperuser, isLoading, isUnguarded, router])

	if (isLoading) return <>{children}</>
	if (!isUnguarded && isAuthenticated && !isSuperuser) return null

	return <>{children}</>
}
