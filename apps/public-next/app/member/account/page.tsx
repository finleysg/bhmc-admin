"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { PlayerInfo } from "./components/player-info"
import { PlayerPassword } from "./components/player-password"

export default function AccountPage() {
	const { data: player, isLoading } = useMyPlayer()

	return (
		<div className="max-w-2xl">
			<Link
				href="/member"
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back
			</Link>
			<h1 className="mb-6 text-2xl font-semibold text-primary">My Account</h1>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			) : player ? (
				<div className="space-y-6">
					<PlayerInfo player={player} />
					<PlayerPassword />
				</div>
			) : null}
		</div>
	)
}
