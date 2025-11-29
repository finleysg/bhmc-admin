"use client"

import { useCallback, useEffect, useState } from "react"

import { useParams } from "next/navigation"

import {
	AdminRegistrationOptions,
	type AdminRegistrationOptionsState,
} from "@/components/admin-registration-options"
import { EventFeePicker } from "@/components/event-fee-picker"
import { PlayerSearch } from "@/components/player-search"
import { ReserveSpot } from "@/components/reserve-spot"
import { SelectAvailable } from "@/components/select-available"
import { useSession } from "@/lib/auth-client"
import type { AdminRegistration, AvailableSlotGroup, ClubEvent, Player } from "@repo/domain/types"

export default function AddPlayerPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const params = useParams()
	const eventId = params.eventId as string

	const [event, setEvent] = useState<ClubEvent | null>(null)
	const [loadingEvent, setLoadingEvent] = useState(true)
	const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
	const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([])
	const [selectedSlotGroup, setSelectedSlotGroup] = useState<AvailableSlotGroup | null>(null)
	const [selectedFees, setSelectedFees] = useState<{ playerId: number; eventFeeId: number }[]>([])
	const [error, setError] = useState<unknown>(null)
	const [registrationId, setRegistrationId] = useState<number | null>(null)
	const [registrationOptions, setRegistrationOptions] = useState<AdminRegistrationOptionsState>({
		expires: 24,
		sendPaymentRequest: true,
		notes: "",
	})
	const [isCompleting, setIsCompleting] = useState(false)
	const [completeSuccess, setCompleteSuccess] = useState(false)

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

	const handleSlotSelect = (slotIds: number[], group?: AvailableSlotGroup) => {
		console.log("Slots selected:", slotIds)
		setSelectedSlotIds(slotIds)
		if (group) {
			setSelectedSlotGroup(group)
		}
		// Clear any previous errors when new slots are selected
		setRegistrationId(null)
		setCompleteSuccess(false)
	}

	const handleFeeChange = useCallback((selections: { playerId: number; eventFeeId: number }[]) => {
		console.log("Fee selections changed:", selections)
		setSelectedFees(selections)
	}, [])

	const handleReserved = (registrationId: number) => {
		setRegistrationId(registrationId)
	}

	const handleCompleteRegistration = async () => {
		if (!registrationId || !selectedSlotGroup) return

		setIsCompleting(true)

		try {
			// Find course ID based on hole ID
			let courseId: number | null = null
			if (event?.courses) {
				for (const course of event.courses) {
					if (course.holes?.some((h) => h.id === selectedSlotGroup.holeId)) {
						courseId = course.id
						break
					}
				}
			}

			// Map fees to full objects required by DTO
			const feesMap = new Map<number, number>() // playerId -> eventFeeId
			selectedFees.forEach((f) => feesMap.set(f.playerId, f.eventFeeId))

			const slots = selectedSlotIds.map((slotId, index) => {
				const player = selectedPlayers[index]
				const feeId = player ? feesMap.get(player.id) : undefined
				const eventFee = feeId ? event?.eventFees?.find((f) => f.id === feeId) : undefined

				return {
					registrationId,
					slotId,
					playerId: player?.id || 0,
					fees: eventFee ? [eventFee] : [],
				}
			})

			const dto: AdminRegistration = {
				userId: Number(session?.user?.id),
				signedUpBy: session?.user?.name || "Admin",
				courseId,
				startingHoleId: selectedSlotGroup.holeId,
				startingOrder: selectedSlotGroup.startingOrder,
				expires: registrationOptions.expires,
				notes: registrationOptions.notes,
				collectPayment: registrationOptions.sendPaymentRequest,
				slots,
			}

			const response = await fetch(
				`/api/registration/${eventId}/admin-registration/${registrationId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(dto),
				},
			)

			if (response.ok) {
				setCompleteSuccess(true)
			} else {
				setError("Failed to complete registration")
			}
		} catch (err) {
			setError(err)
		} finally {
			setIsCompleting(false)
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

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="alert alert-error m-8">
					<span>Error: {JSON.stringify(error)}</span>
				</div>
				<button
					className="btn btn-neutral"
					onClick={() => {
						setError(null)
					}}
				>
					Back
				</button>
			</div>
		)
	}

	const membersOnly = event?.registrationType === "M"

	return (
		<main className="min-h-screen flex justify-center md:p-8">
			<div className="w-full max-w-3xl">
				<div className="card bg-base-100 shadow-xs">
					<div className="card-body">
						<h3 className="card-title text-secondary font-semibold mb-4">Add Player</h3>
						<div className="mb-6">
							<h4 className="font-semibold mb-2">Select Players</h4>
							<PlayerSearch
								membersOnly={membersOnly}
								onPlayerSelected={handlePlayerSelected}
								onPlayerRemoved={handlePlayerRemoved}
								onError={(err) => setError(err)}
							/>
						</div>

						{selectedPlayers.length > 0 && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Find an Open Spot</h4>
								<SelectAvailable
									players={selectedPlayers.length}
									courses={event.courses || []}
									clubEvent={event}
									onError={(err) => setError(err)}
									onSlotSelect={handleSlotSelect}
								/>
							</div>
						)}

						{selectedSlotIds.length > 0 && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Select Fees</h4>
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
								<h4 className="font-semibold mb-2">Hold This Spot</h4>{" "}
								<ReserveSpot
									eventId={eventId}
									selectedSlotIds={selectedSlotIds}
									onReserved={handleReserved}
									disabled={false}
								/>
								{registrationId && (
									<div className="alert alert-success mb-4">
										<span>Slots reserved successfully! Registration ID: {registrationId}</span>
									</div>
								)}
							</div>
						)}

						{registrationId || (
							<>
								<div className="mb-6">
									<h4 className="font-semibold mb-2">Registration Details</h4>
									<AdminRegistrationOptions onChange={setRegistrationOptions} />
								</div>

								<div>
									{completeSuccess ? (
										<div className="alert alert-success">
											<span>Registration completed successfully!</span>
										</div>
									) : (
										<button
											type="button"
											className="btn btn-success"
											onClick={() => void handleCompleteRegistration()}
											disabled={isCompleting}
										>
											{isCompleting ? (
												<>
													<span className="loading loading-spinner loading-sm"></span>
													Completing...
												</>
											) : (
												"Complete Registration"
											)}
										</button>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
