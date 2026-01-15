import { useState } from "react"

import { toast } from "react-toastify"

import { ErrorDisplay } from "../../components/feedback/error-display"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { IndexTab } from "../../components/tab/index-tab"
import { Tabs } from "../../components/tab/tabs"
import { useDropPlayers } from "../../hooks/use-drop-players"
import { useEventRegistrationSlots } from "../../hooks/use-event-registration-slots"
import { useIssueMultipleRefunds } from "../../hooks/use-issue-refunds"
import { useMovePlayers } from "../../hooks/use-move-players"
import { useRegisterPlayer } from "../../hooks/use-register-player"
import { useSwapPlayers } from "../../hooks/use-swap-players"
import { ClubEventProps } from "../../models/common-props"
import { RefundData } from "../../models/refund"
import { LoadReserveTables, ReserveSlot } from "../../models/reserve"
import { ReserveGridAdmin } from "./reserve-grid"

/**
 * Manage players for events where players are selecting their own tee times or
 * starting holes.
 */
export function ReserveManager1({ clubEvent }: ClubEventProps) {
	const [selectedTableIndex, updateSelectedTableIndex] = useState(0)
	const [busy, setBusy] = useState(false)
	const { data: slots } = useEventRegistrationSlots(clubEvent.id)
	const {
		mutateAsync: registerPlayer,
		status: registerStatus,
		error: registerError,
	} = useRegisterPlayer(clubEvent.id)
	const { mutateAsync: movePlayers, status: moveStatus, error: moveError } = useMovePlayers()
	const { mutateAsync: dropPlayers, status: dropStatus, error: dropError } = useDropPlayers()
	const { mutateAsync: swapPlayers, status: swapStatus, error: swapError } = useSwapPlayers()
	const issueRefunds = useIssueMultipleRefunds()

	const reserveTables = LoadReserveTables(clubEvent, slots ?? [])

	const handleRegister = async (
		slot: ReserveSlot,
		playerId: number,
		feeIds: number[],
		isMoneyOwed: boolean,
		notes: string,
	) => {
		await registerPlayer({ playerId, fees: feeIds, isMoneyOwed, slotId: slot.id, notes })
		toast.success("Player registration was successful.")
	}

	const handleMove = async (
		registrationId: number,
		sourceSlots: ReserveSlot[],
		destinationSlots: ReserveSlot[],
	) => {
		await movePlayers({
			registrationId,
			sourceSlotIds: sourceSlots.map((s) => s.id),
			destinationSlotIds: destinationSlots.map((d) => d.id),
		})
		toast.success("Player move was successful.")
	}

	const handleDrop = async (
		registrationId: number,
		slotIds: number[],
		refunds: Map<number, RefundData>,
	) => {
		try {
			setBusy(true)
			await issueRefunds(refunds)
			await dropPlayers({ registrationId, slotIds })
			toast.success("Player drop was successful.")
		} finally {
			setBusy(false)
		}
	}

	const handleRefund = async (refunds: Map<number, RefundData>) => {
		try {
			setBusy(true)
			await issueRefunds(refunds)
			toast.success("Refunds have been triggered.")
		} finally {
			setBusy(false)
		}
	}

	const handleSwap = async (slot: ReserveSlot, newPlayerId: number) => {
		await swapPlayers({
			slotId: slot.id,
			playerId: newPlayerId,
		})
		toast.success("Player swap was successful.")
	}

	return (
		<div className="row">
			<div className="col-12">
				<div>
					<Tabs>
						{reserveTables.map((table, index) => {
							return (
								<IndexTab
									key={table.course.id}
									index={index}
									selectedIndex={selectedTableIndex}
									onSelect={(i) => updateSelectedTableIndex(i)}
								>
									{table.course.name}
								</IndexTab>
							)
						})}
					</Tabs>
					<OverlaySpinner
						loading={
							busy ||
							dropStatus === "pending" ||
							moveStatus === "pending" ||
							swapStatus === "pending" ||
							registerStatus === "pending"
						}
					/>
					{moveError && <ErrorDisplay error={moveError.message} delay={5000} />}
					{dropError && <ErrorDisplay error={dropError.message} delay={5000} />}
					{swapError && <ErrorDisplay error={swapError.message} delay={5000} />}
					{registerError && <ErrorDisplay error={registerError.message} delay={5000} />}
					<ReserveGridAdmin
						className="mt-4"
						clubEvent={clubEvent}
						table={reserveTables[selectedTableIndex]}
						onRegister={handleRegister}
						onMove={handleMove}
						onDrop={handleDrop}
						onRefund={handleRefund}
						onSwap={handleSwap}
					/>
				</div>
			</div>
		</div>
	)
}
