import { useState } from "react"

import { toast } from "react-toastify"

import { ErrorDisplay } from "../../components/feedback/error-display"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useDropPlayers } from "../../hooks/use-drop-players"
import { useEventRegistrations } from "../../hooks/use-event-registrations"
import { useIssueMultipleRefunds } from "../../hooks/use-issue-refunds"
import { useRegisterPlayer } from "../../hooks/use-register-player"
import { useChangeEvent, useRegistrationUpdate } from "../../hooks/use-registration-update"
import { useSwapPlayers } from "../../hooks/use-swap-players"
import { ClubEventProps } from "../../models/common-props"
import { RefundData } from "../../models/refund"
import { ReserveSlot } from "../../models/reserve"
import { ReserveListAdmin } from "./reserve-list"

/**
 * Manage players for majors and other events where players are not selecting
 * their own tee times or starting holes.
 */
export function ReserveManager2({ clubEvent }: ClubEventProps) {
	const [busy, setBusy] = useState(false)
	const { data: registrations, status, error } = useEventRegistrations(clubEvent.id)
	const {
		mutateAsync: registerPlayer,
		status: registerStatus,
		error: registerError,
	} = useRegisterPlayer(clubEvent.id)
	const { mutateAsync: dropPlayers, status: dropStatus, error: dropError } = useDropPlayers()
	const { mutateAsync: swapPlayers, status: swapStatus, error: swapError } = useSwapPlayers()
	const { mutateAsync: updateNotes, status: noteStatus, error: noteError } = useRegistrationUpdate()
	const { mutateAsync: changeEvent, status: changeStatus, error: changeError } = useChangeEvent()
	const issueRefunds = useIssueMultipleRefunds()

	const handleRegister = async (
		playerId: number,
		feeIds: number[],
		isMoneyOwed: boolean,
		notes: string,
	) => {
		await registerPlayer({ slotId: 0, playerId, fees: feeIds, isMoneyOwed, notes })
		toast.success("Player registration was successful.")
	}

	const handleDrop = async (
		registrationId: number,
		slotIds: number[],
		refunds: Map<number, RefundData>,
	) => {
		try {
			setBusy(true)
			issueRefunds(refunds)
				?.then(() => {
					dropPlayers({ registrationId, slotIds }).then(() => {
						toast.success("Player drop was successful.")
					})
				})
				.catch(() => {
					toast.error("Failed to issue refund(s).")
				})
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

	const handleChangeEvent = async (registrationId: number, targetEventId: number) => {
		await changeEvent({
			registrationId: registrationId,
			targetEventId: targetEventId,
		})
		toast.success("Player(s) have been moved to selected event.")
	}

	const handleEditNotes = async (registrationId: number, notes: string) => {
		await updateNotes({ registrationId, notes })
		toast.success("Notes were updated.")
	}

	return (
		<div>
			<OverlaySpinner
				loading={
					busy ||
					status === "pending" ||
					dropStatus === "pending" ||
					swapStatus === "pending" ||
					registerStatus === "pending" ||
					noteStatus === "pending" ||
					changeStatus === "pending"
				}
			/>
			{error && <ErrorDisplay error={error.message} delay={5000} />}
			{dropError && <ErrorDisplay error={dropError.message} delay={5000} />}
			{swapError && <ErrorDisplay error={swapError.message} delay={5000} />}
			{registerError && <ErrorDisplay error={registerError.message} delay={5000} />}
			{noteError && <ErrorDisplay error={noteError.message} delay={5000} />}
			{changeError && <ErrorDisplay error={changeError.message} delay={5000} />}
			<ReserveListAdmin
				clubEvent={clubEvent}
				registrations={registrations ?? []}
				onRegister={handleRegister}
				onDrop={handleDrop}
				onRefund={handleRefund}
				onSwap={handleSwap}
				onNotesEdit={handleEditNotes}
				onChangeEvent={handleChangeEvent}
			/>
		</div>
	)
}
