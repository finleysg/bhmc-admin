"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { PlayerSearch } from "@/components/player-search"
import { SelectAvailable } from "@/components/select-available"
import { useSession } from "@/lib/auth-client"
import type { ClubEvent, Player } from "@repo/domain/types"

export default function AddPlayerPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const params = useParams()
	const eventId = params.eventId as string

	const [event, setEvent] = useState<ClubEvent | null>(null)
	const [loadingEvent, setLoadingEvent] = useState(true)
	const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([])

	// Fetch event details
	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (response.ok) {
					const eventData = (await response.json()) as ClubEvent
					setEvent(eventData)
				} else {
					console.error("Failed to fetch event")
				}
			} catch (error) {
				console.error("Error fetching event:", error)
			} finally {
				setLoadingEvent(false)
			}
		}

		if (signedIn && !isPending) {
			void fetchEvent()
		}
	}, [signedIn, isPending, eventId])

	const handlePlayerSelected = (player: Player) => {
		console.log("Player selected:", player)
		setSelectedPlayers((prev) => [...prev, player])
	}

	const handlePlayerRemoved = (player: Player) => {
		console.log("Player removed:", player)
		setSelectedPlayers((prev) => prev.filter((p) => p.id !== player.id || p.email !== player.email))
	}

	const handleSlotSelect = (slotIds: number[]) => {
		console.log("Slots selected:", slotIds)
		setSelectedSlotIds(slotIds)
	}

	if (isPending || loadingEvent) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
	}

	const membersOnly = event?.registrationType === "M"

	return (
		<main className="min-h-screen flex justify-center p-8">
			<div className="w-full max-w-3xl">
				<div className="card bg-base-100 shadow-xl">
					<div className="card-body">
						<h3 className="card-title text-2xl font-bold mb-4">Add Player</h3>
						<div className="mb-6">
							<h4 className="font-semibold mb-2">Step 1: Select Players</h4>
							<PlayerSearch
								membersOnly={membersOnly}
								onPlayerSelected={handlePlayerSelected}
								onPlayerRemoved={handlePlayerRemoved}
							/>
						</div>

						{selectedPlayers.length > 0 && event?.canChoose && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 2: Find an Open Spot</h4>
								<SelectAvailable
									eventId={Number(eventId)}
									players={selectedPlayers.length}
									courses={event.courses || []}
									event={event}
									onSlotSelect={handleSlotSelect}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
