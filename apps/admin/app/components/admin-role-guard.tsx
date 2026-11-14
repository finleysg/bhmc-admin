"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

import { useAuth } from "../../lib/auth-context"

const UNGUARDED_ROUTES = ["/sign-in", "/restricted"]

export function AdminRoleGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, hasAdminAccess, isLoading } = useAuth()
	const router = useRouter()
	const pathname = usePathname()

	const isUnguarded = UNGUARDED_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	)

	useEffect(() => {
		if (isLoading || isUnguarded) return
		if (isAuthenticated && !hasAdminAccess) {
			router.replace("/restricted")
		}
	}, [isAuthenticated, hasAdminAccess, isLoading, isUnguarded, router])

	if (isLoading) return <>{children}</>
	if (!isUnguarded && isAuthenticated && !hasAdminAccess) return null

	return <>{children}</>
}
