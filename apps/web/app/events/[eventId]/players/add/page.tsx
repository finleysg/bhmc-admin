"use client"

import { useCallback, useEffect, useReducer } from "react"

import { useParams } from "next/navigation"

import { AdminRegistrationOptions } from "@/components/admin-registration-options"
import { EventFeePicker } from "@/components/event-fee-picker"
import { PlayerSearch } from "@/components/player-search"
import { ReserveSpot } from "@/components/reserve-spot"
import { SelectAvailable } from "@/components/select-available"
import { useSession } from "@/lib/auth-client"
import type { AvailableSlotGroup, ClubEvent, Player } from "@repo/domain/types"

import { reducer, getInitialState } from "./reducer"

export default function AddPlayerPage() {
	const { data: session, isPending } = useSession()
	const signedIn = !!session?.user
	const params = useParams()
	const eventId = params.eventId as string

	const [state, dispatch] = useReducer(reducer, getInitialState())

	useEffect(() => {
		if (session?.user) {
			dispatch({
				type: "SET_USER",
				payload: {
					signedUpBy: session.user.name || "Admin",
				},
			})
		}
	}, [session?.user])

	// Fetch event details
	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (response.ok) {
					const eventData = (await response.json()) as ClubEvent
					dispatch({ type: "SET_EVENT", payload: eventData })
				} else {
					console.error("Failed to fetch event")
				}
			} catch (error) {
				console.error("Error fetching event:", error)
			} finally {
				dispatch({ type: "SET_IS_LOADING", payload: false })
			}
		}

		if (signedIn && !isPending) {
			void fetchEvent()
		}
	}, [signedIn, isPending, eventId])

	const handlePlayerSelected = (player: Player) => {
		dispatch({ type: "ADD_PLAYER", payload: player })
	}

	const handlePlayerRemoved = (player: Player) => {
		dispatch({ type: "REMOVE_PLAYER", payload: player })
	}

	const handleSlotSelect = (slotIds: number[], group?: AvailableSlotGroup) => {
		dispatch({ type: "SELECT_SLOTS", payload: { slotIds, group } })
	}

	const handleFeeChange = useCallback((selections: { playerId: number; eventFeeId: number }[]) => {
		dispatch({ type: "SET_FEES", payload: selections })
	}, [])

	const handleReserved = (registrationId: number) => {
		dispatch({ type: "SET_REGISTRATION_ID", payload: registrationId })
	}

	const handleError = (err: unknown) => {
		dispatch({ type: "SET_ERROR", payload: err })
	}

	const handleCompleteRegistration = async () => {
		if (!state.registrationId || !state.selectedSlotGroup) return

		dispatch({ type: "SET_IS_LOADING", payload: true })

		try {
			const dto = state.adminRegistration

			const response = await fetch(
				`/api/registration/${eventId}/admin-registration/${state.registrationId}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(dto),
				},
			)

			if (response.ok) {
				dispatch({ type: "SET_COMPLETE_SUCCESS", payload: true })
			} else {
				dispatch({ type: "SET_ERROR", payload: "Failed to complete registration" })
			}
		} catch (err) {
			dispatch({ type: "SET_ERROR", payload: err })
		} finally {
			dispatch({ type: "SET_IS_LOADING", payload: false })
		}
	}

	if (isPending || state.isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!signedIn && !isPending) {
		return null // Redirecting
	}

	if (state.error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="alert alert-error m-8">
					<span>Error: {JSON.stringify(state.error)}</span>
				</div>
				<button
					className="btn btn-neutral"
					onClick={() => {
						dispatch({ type: "RESET_ERROR" })
					}}
				>
					Back
				</button>
			</div>
		)
	}

	const membersOnly = state.event?.registrationType === "M"

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
								onError={handleError}
							/>
						</div>

						{state.canSelectGroup && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Find an Open Spot</h4>
								<SelectAvailable
									players={state.selectedPlayers.length}
									courses={state.event?.courses || []}
									clubEvent={state.event}
									onError={handleError}
									onSlotSelect={handleSlotSelect}
								/>
							</div>
						)}

						{state.canSelectFees && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Select Fees</h4>
								{state.event?.eventFees && (
									<EventFeePicker
										fees={state.event.eventFees}
										players={state.selectedPlayers}
										onChange={handleFeeChange}
									/>
								)}
							</div>
						)}

						{state.canReserveSpot && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Hold This Spot</h4>{" "}
								<ReserveSpot
									eventId={eventId}
									selectedSlotIds={state.selectedSlotGroup?.slots.map((s) => s.id) ?? []}
									onReserved={handleReserved}
									onError={handleError}
									disabled={false}
								/>
							</div>
						)}

						{state.canCompleteRegistration && (
							<>
								<div className="mb-6">
									<h4 className="font-semibold mb-2">Registration Details</h4>
									<AdminRegistrationOptions
										options={state.registrationOptions}
										onChange={(opts) =>
											dispatch({ type: "SET_REGISTRATION_OPTIONS", payload: opts })
										}
									/>
								</div>

								<div>
									{state.completeSuccess ? (
										<div className="alert alert-success">
											<span>Registration completed successfully!</span>
										</div>
									) : (
										<button
											type="button"
											className="btn btn-success"
											onClick={() => void handleCompleteRegistration()}
											disabled={state.isLoading}
										>
											{state.isLoading ? (
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
