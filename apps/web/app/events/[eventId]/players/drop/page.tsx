"use client"

import { useReducer, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { GroupSearch } from "../components/group-search"
import SelectPlayers from "../components/select-players"
import type { ValidatedClubEvent } from "@repo/domain/types"
import { reducer, initialState } from "./reducer"
import { PaidFeePicker } from "../components/paid-fee-picker"

/**
 * Display the Drop Player page for a club event, allowing selection of a registration group, selection/removal of player(s) to drop, and picking fees to refund.
 *
 * @returns The page's React element
 */
export default function DropPlayerPage() {
	const { eventId } = useParams<{ eventId: string }>()
	const [state, dispatch] = useReducer(reducer, initialState)

	const slots = useMemo(
		() =>
			state.selectedGroup
				? state.selectedGroup.slots.filter(
						(slot) => slot.player && state.selectedPlayers.some((p) => p.id === slot.player.id),
					)
				: [],
		[state.selectedGroup, state.selectedPlayers],
	)

	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const response = await fetch(`/api/events/${eventId}`)
				if (response.ok) {
					const eventData = (await response.json()) as ValidatedClubEvent
					dispatch({ type: "SET_EVENT", payload: eventData })
				} else {
					dispatch({ type: "SET_ERROR", payload: "Failed to fetch event" })
				}
			} catch (err) {
				dispatch({ type: "SET_ERROR", payload: err })
			} finally {
				dispatch({ type: "SET_LOADING", payload: false })
			}
		}
		if (eventId) {
			void fetchEvent()
		}
	}, [eventId])

	const handleFeesChange = (selections: { slotId: number; registrationFeeIds: number[] }[]) => {
		dispatch({ type: "SET_FEES", payload: selections })
	}

	if (state.isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<span className="loading loading-spinner loading-lg"></span>
			</div>
		)
	}

	if (!state.clubEvent) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="alert alert-error">Event not found</div>
			</div>
		)
	}

	return (
		<main className="min-h-screen flex justify-center md:p-8">
			<div className="w-full max-w-3xl">
				<div className="card bg-base-100 shadow-xs">
					<div className="card-body">
						<h3 className="card-title text-secondary font-semibold mb-4">Drop Player</h3>
						<div className="mb-6">
							<h4 className="font-semibold mb-2">Select Group</h4>
							<GroupSearch
								clubEvent={state.clubEvent}
								onGroupSelected={(group) => dispatch({ type: "SET_GROUP", payload: group })}
								onError={(err) => dispatch({ type: "SET_ERROR", payload: err })}
							/>
						</div>
						{state.selectedGroup && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Select Player(s) to Drop</h4>
								<SelectPlayers
									group={state.selectedGroup}
									selectedPlayers={state.selectedPlayers}
									onSelect={(player) => dispatch({ type: "SELECT_PLAYER", payload: player })}
									onRemove={(player) => {
										setTimeout(() => dispatch({ type: "REMOVE_PLAYER", payload: player }), 0)
									}}
								/>
							</div>
						)}
						{state.selectedPlayers.length > 0 && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2">Select Fees to Refund</h4>
								<PaidFeePicker
									clubEvent={state.clubEvent}
									slots={slots}
									onChange={handleFeesChange}
								/>
							</div>
						)}
						{state.error && (
							<div className="mb-6">
								<h4 className="font-semibold mb-2 text-error">Unhandled Error</h4>
								<div className="alert alert-error text-xs mb-2">
									<span className="text-wrap">
										Error: {typeof state.error === "string" ? state.error : "Unknown error"}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	)
}
