"use client"

import { useCallback, useEffect, useState } from "react"

import { useParams } from "next/navigation"

import { EventFeePicker } from "@/components/event-fee-picker"
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
	const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([])
	const [selectedFees, setSelectedFees] = useState<{ playerId: number; eventFeeId: number }[]>([])
	const [isReserving, setIsReserving] = useState(false)
	const [reserveError, setReserveError] = useState<string | null>(null)
	const [registrationId, setRegistrationId] = useState<number | null>(null)

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
		// Clear any previous errors when new slots are selected
		setReserveError(null)
		setRegistrationId(null)
	}

	const handleFeeChange = useCallback((selections: { playerId: number; eventFeeId: number }[]) => {
		console.log("Fee selections changed:", selections)
		setSelectedFees(selections)
	}, [])

	const handleReserveSlots = async () => {
		if (selectedSlotIds.length === 0) return

		setIsReserving(true)
		setReserveError(null)

		try {
			const response = await fetch(`/api/registration/${eventId}/reserve`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(selectedSlotIds),
			})

			if (response.ok) {
				const data = (await response.json()) as { id: number }
				setRegistrationId(data.id)
				console.log("Slots reserved successfully, registration ID:", data.id)
			} else {
				// Handle error - slots no longer available
				setReserveError("Slots no longer available")
				setSelectedSlotIds([]) // Reset slot selection to force re-selection
			}
		} catch (error) {
			console.error("Error reserving slots:", error)
			setReserveError("An error occurred while reserving slots")
		} finally {
			setIsReserving(false)
		}
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
		<main className="min-h-screen flex justify-center md:p-8">
			<div className="w-full max-w-3xl">
				<div className="card bg-base-100 shadow-xs">
					<div className="card-body">
						<h3 className="card-title text-secondary font-semibold mb-4">Add Player</h3>
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

						{selectedSlotIds.length > 0 && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 3: Select Fees</h4>
								{event?.eventFees && (
									<EventFeePicker
										fees={event.eventFees}
										players={selectedPlayers}
										onChange={handleFeeChange}
									/>
								)}
							</div>
						)}

						{selectedSlotIds.length > 0 && selectedFees.length > 0 && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Step 4: Hold This Spot</h4>
								{reserveError && (
									<div className="alert alert-error mb-4">
										<span>{reserveError}</span>
									</div>
								)}
								{registrationId ? (
									<div className="alert alert-success mb-4">
										<span>Slots reserved successfully! Registration ID: {registrationId}</span>
									</div>
								) : (
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => void handleReserveSlots()}
										disabled={isReserving}
									>
										{isReserving ? (
											<>
												<span className="loading loading-spinner loading-sm"></span>
												Reserving...
											</>
										) : (
											"Reserve Now"
										)}
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
