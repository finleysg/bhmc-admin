"use client"

import Link from "next/link"

import { useAuth } from "@/lib/auth-context"
import type { PlayerSummary } from "@/lib/types"

interface PlayerLinkProps {
	player: PlayerSummary
	children?: React.ReactNode
}

export function PlayerLink({ player, children }: PlayerLinkProps) {
	const { isAuthenticated } = useAuth()
	const name = `${player.first_name} ${player.last_name}`

	if (isAuthenticated) {
		return (
			<Link href={`/directory/${player.id}`} className="text-primary hover:underline">
				{children ?? name}
			</Link>
		)
	}

	return <span>{children ?? name}</span>
}
