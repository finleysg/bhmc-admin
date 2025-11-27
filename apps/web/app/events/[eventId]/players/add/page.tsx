"use client"

import { useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { PlayerSearch } from "@/components/player-search"
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
						<h2 className="card-title text-2xl font-bold mb-4">Add Player</h2>

						{event && (
							<div className="mb-6">
								<h3 className="font-semibold">{event.name}</h3>
								<p className="text-sm text-base-content/70">
									Registration Type: {event.registrationType === "M" ? "Members Only" : "Open"}
								</p>
							</div>
						)}

						<div className="mb-6">
							<label className="label">
								<span className="label-text">Select Players</span>
							</label>
							<PlayerSearch
								membersOnly={membersOnly}
								onPlayerSelected={handlePlayerSelected}
								onPlayerRemoved={handlePlayerRemoved}
							/>
						</div>

						{selectedPlayers.length > 0 && (
							<div className="mt-6">
								<h4 className="font-semibold mb-2">Selected Players ({selectedPlayers.length})</h4>
								<div className="space-y-2">
									{selectedPlayers.map((player) => (
										<div key={player.id || player.email} className="p-3 bg-base-200 rounded-lg">
											<div className="font-medium">
												{player.firstName} {player.lastName}
											</div>
											<div className="text-sm text-base-content/70">
												{player.email}
												{player.ghin && ` • GHIN: ${player.ghin}`}
											</div>
										</div>
									))}
								</div>

								{/* Placeholder for next step */}
								<div className="mt-6 p-4 bg-base-200 rounded-lg">
									<p className="text-sm text-base-content/70">
										Next: Assign selected players to slots
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
