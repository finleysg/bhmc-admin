"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { useRegistration } from "@/lib/registration/registration-context"
import type { ClubEventDetail } from "@/lib/types"
import { PlayerPicker } from "../../components/player-picker"
import { RegistrationPageWrapper } from "../../components/registration-page-wrapper"

export default function AddPlayersPage() {
	return (
		<RegistrationPageWrapper>
			{(event) => <AddPlayersContent event={event} />}
		</RegistrationPageWrapper>
	)
}

function AddPlayersContent({ event }: { event: ClubEventDetail }) {
	const router = useRouter()
	const eventUrl = getEventUrl(event)
	const { data: player } = useMyPlayer()
	const { registration, editRegistration, initiateStripeSession, loadRegistration } =
		useRegistration()

	const [selectedPlayers, setSelectedPlayers] = useState<{ id: number; name: string }[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const loadedRef = useRef(false)

	useEffect(() => {
		if (loadedRef.current || !player?.id) return
		loadedRef.current = true
		void loadRegistration(player.id)
	}, [player?.id, loadRegistration])

	const filledSlots = registration?.slots.filter((s) => s.player) ?? []
	const maxGroupSize = event.maximum_signup_group_size ?? 1
	const availableSlots = maxGroupSize - filledSlots.length

	const excludeIds = [...filledSlots.map((s) => s.player!.id), ...selectedPlayers.map((p) => p.id)]

	const handlePlayerSelect = useCallback(
		(playerId: number, playerName: string) => {
			if (selectedPlayers.length >= availableSlots) {
				toast.error("No more slots available")
				return
			}
			setSelectedPlayers((prev) => [...prev, { id: playerId, name: playerName }])
		},
		[selectedPlayers.length, availableSlots],
	)

	const handleRemovePlayer = (playerId: number) => {
		setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId))
	}

	const handleConfirm = async () => {
		if (!registration || selectedPlayers.length === 0) return

		setIsSubmitting(true)
		try {
			await editRegistration(
				registration.id,
				selectedPlayers.map((p) => p.id),
			)
			initiateStripeSession()
			router.push(`${eventUrl}/edit`)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to add players")
			setIsSubmitting(false)
		}
	}

	const handleBack = () => {
		router.push(`${eventUrl}/manage`)
	}

	if (!registration) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">Loading registration...</p>
				</CardContent>
			</Card>
		)
	}

	if (availableSlots <= 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Add Players</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground">No available slots to add players.</p>
					<div className="flex justify-end">
						<Button variant="secondary" onClick={handleBack}>
							Back
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Add Players</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					{availableSlots - selectedPlayers.length} slot(s) available
				</p>

				{selectedPlayers.length > 0 && (
					<div className="space-y-1">
						{selectedPlayers.map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
							>
								<span>{p.name}</span>
								<button
									type="button"
									className="text-xs text-destructive hover:underline"
									onClick={() => handleRemovePlayer(p.id)}
								>
									Remove
								</button>
							</div>
						))}
					</div>
				)}

				{selectedPlayers.length < availableSlots && (
					<PlayerPicker eventId={event.id} onSelect={handlePlayerSelect} excludeIds={excludeIds} />
				)}

				<div className="flex justify-end gap-2">
					<Button variant="secondary" onClick={handleBack} disabled={isSubmitting}>
						Back
					</Button>
					<Button
						onClick={() => void handleConfirm()}
						disabled={selectedPlayers.length === 0 || isSubmitting}
					>
						{isSubmitting ? "Adding..." : "Continue"}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
