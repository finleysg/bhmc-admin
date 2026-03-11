"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"

import type { Player, PlayerUpdate } from "@repo/domain/types"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/app/components/ui/loading-spinner"
import { Alert } from "@/app/components/ui/alert"
import { PageLayout } from "@/app/components/ui/page-layout"
import { Card, CardBody, CardTitle } from "@/app/components/ui/card"
import { PlayerForm } from "../components/player-form"

export default function EditPlayerPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const router = useRouter()
	const params = useParams()
	const playerId = params.playerId as string

	const [player, setPlayer] = useState<Player | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [saveCount, setSaveCount] = useState(0)

	const fetchPlayer = useCallback(async () => {
		const res = await fetch(`/api/registration/players/${playerId}`)
		if (!res.ok) {
			throw new Error("Player not found")
		}
		const data = (await res.json()) as Player
		setPlayer(data)
	}, [playerId])

	useEffect(() => {
		if (signedIn && playerId) {
			const loadData = async () => {
				try {
					await fetchPlayer()
				} catch (err) {
					setError(err instanceof Error ? err.message : "Failed to load player")
				} finally {
					setIsLoading(false)
				}
			}
			void loadData()
		}
	}, [signedIn, playerId, fetchPlayer])

	const handleSubmit = async (data: PlayerUpdate) => {
		setIsSubmitting(true)
		setError(null)

		try {
			const res = await fetch(`/api/registration/players/${playerId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { message?: string }
				throw new Error(errorData.message ?? "Failed to update player")
			}

			const updated = (await res.json()) as Player
			setPlayer(updated)
			setSaveCount((c) => c + 1)
			toast.success("Player updated")
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update player")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCancel = () => {
		router.push("/club/players")
	}

	if (isPending || isLoading) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	if (!player) {
		return (
			<PageLayout maxWidth="3xl">
				<div className="text-center py-8">
					<p className="text-base-content/70 mb-4">{error ?? "Player not found"}</p>
					<button onClick={() => router.push("/club/players")} className="btn btn-primary">
						Back to Players
					</button>
				</div>
			</PageLayout>
		)
	}

	return (
		<PageLayout maxWidth="3xl">
			{error && (
				<Alert type="error" className="mb-4">
					{error}
				</Alert>
			)}
			<Card shadow="xs">
				<CardBody>
					<CardTitle>
						{player.firstName} {player.lastName}
					</CardTitle>
					<PlayerForm
						key={saveCount}
						player={player}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						isSubmitting={isSubmitting}
					/>
				</CardBody>
			</Card>
		</PageLayout>
	)
}
