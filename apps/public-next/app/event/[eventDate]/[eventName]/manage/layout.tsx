"use client"

import { type PropsWithChildren } from "react"

import { useAuth } from "@/lib/auth-context"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { useRegistration } from "@/lib/registration/registration-context"

export default function ManageLayout({ children }: PropsWithChildren) {
	const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
	const { clubEvent } = useRegistration()
	const { data: player, isLoading: isPlayerLoading } = useMyPlayer()
	const { data: registrationData, isLoading: isRegLoading } = usePlayerRegistration(
		clubEvent?.id,
		player?.id,
	)

	if (isAuthLoading || isPlayerLoading || isRegLoading) {
		return (
			<div className="flex justify-center py-12">
				<div className="text-muted-foreground text-sm">Loading...</div>
			</div>
		)
	}

	if (!isAuthenticated || !registrationData?.registration) {
		return (
			<div className="flex justify-center py-12">
				<div className="text-muted-foreground text-sm">No registration found.</div>
			</div>
		)
	}

	return <>{children}</>
}
