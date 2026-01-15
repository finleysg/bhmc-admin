import { ComponentPropsWithoutRef, useState } from "react"

import { Modal } from "../../components/dialog/modal"
import { ClubEvent } from "../../models/club-event"
import { Player } from "../../models/player"
import { createRefunds, RefundData } from "../../models/refund"
import { Registration } from "../../models/registration"
import { ConvertRegistrationsToReservations, Reservation, ReserveSlot } from "../../models/reserve"
import { AddPlayer } from "./add-player"
import { ChangeEvent } from "./change-event"
import { DropPlayers } from "./drop-players"
import { EditNotes } from "./edit-notes"
import { ReservationAdmin } from "./reservation"
import { SwapPlayers } from "./swap-players"

interface ReserveListAdminProps extends Omit<ComponentPropsWithoutRef<"div">, "onDrop"> {
	clubEvent: ClubEvent
	registrations: Registration[]
	onRegister: (playerId: number, feeIds: number[], isMoneyOwed: boolean, notes: string) => void
	onDrop: (registrationId: number, slotIds: number[], refunds: Map<number, RefundData>) => void
	onRefund: (refunds: Map<number, RefundData>) => void
	onSwap: (slot: ReserveSlot, newPlayerId: number) => void
	onNotesEdit: (registrationId: number, notes: string) => void
	onChangeEvent: (registrationId: number, targetEventId: number) => void
}

/**
 * Renders a list of players who have registered for a club event.
 * The event is not a can-choose event, so the players are not selecting
 * their own tee times or starting holes.
 */
export function ReserveListAdmin({
	clubEvent,
	registrations,
	onRegister,
	onDrop,
	onRefund,
	onSwap,
	onNotesEdit,
	onChangeEvent,
	...rest
}: ReserveListAdminProps) {
	const [selectedSlotId, setSelectedSlotId] = useState(-1)
	const [selectedRegistrationId, setSelectedRegistrationId] = useState(-1)
	const [selectedSlots, setSelectedSlots] = useState<ReserveSlot[]>([])
	const [showAdd, setShowAdd] = useState(false)
	const [showDrop, setShowDrop] = useState(false)
	const [showSwap, setShowSwap] = useState(false)
	const [showNotes, setShowNotes] = useState(false)
	const [showChange, setShowChange] = useState(false)

	const reservations = ConvertRegistrationsToReservations(registrations ?? [])
	const notes = new Map(registrations.map((r) => [r.id, r.notes]))

	const handleSlotSelect = (reservation: Reservation) => {
		setSelectedRegistrationId(-1)

		if (selectedSlotId === reservation.slotId) {
			setSelectedSlotId(-1)
		} else {
			setSelectedSlotId(reservation.slotId)
			const possible = registrations.find((r) => r.id === reservation.registrationId)
			if (possible) {
				const slot = possible.slots.find((s) => s.id === reservation.slotId)
				if (slot) {
					setSelectedSlots([new ReserveSlot(possible.id.toString(), slot)])
				}
			}
		}
	}

	const handleGroupSelect = (reservation: Reservation) => {
		setSelectedSlotId(-1)
		setSelectedSlots([])

		if (selectedRegistrationId === reservation.registrationId) {
			setSelectedRegistrationId(-1)
		} else {
			setSelectedRegistrationId(reservation.registrationId)
			const possible = registrations.find((r) => r.id === reservation.registrationId)
			if (possible) {
				setSelectedSlots(possible.slots.map((s) => new ReserveSlot(possible.id.toString(), s)))
			}
		}
	}

	const handleAdd = () => {
		setShowAdd(true)
	}

	const handleAddConfirm = (
		player: Player,
		feeIds: number[],
		isMoneyOwed: boolean,
		notes: string,
	) => {
		try {
			onRegister(player.id, feeIds, isMoneyOwed, notes)
		} finally {
			setShowAdd(false)
			setSelectedSlotId(-1)
			setSelectedRegistrationId(-1)
		}
	}

	const handleAddCancel = () => {
		setShowAdd(false)
		setSelectedSlotId(-1)
		setSelectedRegistrationId(-1)
	}

	const handleDrop = () => {
		if (selectedSlots?.length > 0) {
			setShowDrop(true)
		}
	}

	const handleDropConfirm = (dropSlots: ReserveSlot[], dropNotes: string) => {
		try {
			const registrationId =
				selectedRegistrationId > 0 ? selectedRegistrationId : dropSlots[0].registrationId
			if (!registrationId) {
				throw new Error("Failed assertion: No registration id found.")
			}
			const slotIds = dropSlots.map((slot) => slot.id)
			const refunds = createRefunds(dropSlots, dropNotes)
			onDrop(registrationId, slotIds, refunds)
		} finally {
			setShowDrop(false)
			setSelectedSlotId(-1)
			setSelectedRegistrationId(-1)
		}
	}

	const handleRefundConfirm = (slots: ReserveSlot[], notes: string) => {
		try {
			const refunds = createRefunds(slots, notes)
			onRefund(refunds)
		} finally {
			setShowDrop(false)
			setSelectedSlotId(-1)
			setSelectedRegistrationId(-1)
		}
	}

	const handleDropCancel = () => {
		setShowDrop(false)
		setSelectedSlotId(-1)
		setSelectedRegistrationId(-1)
	}

	const handleSwap = () => {
		if (selectedSlots?.length === 1) {
			setShowSwap(true)
		}
	}

	const handleSwapConfirm = (player: Player) => {
		try {
			onSwap(selectedSlots[0], player.id)
		} finally {
			setShowSwap(false)
			setSelectedSlotId(-1)
			setSelectedRegistrationId(-1)
		}
	}

	const handleSwapCancel = () => {
		setShowSwap(false)
		setSelectedSlotId(-1)
		setSelectedRegistrationId(-1)
	}

	const handleEditNotes = () => {
		if (selectedSlots?.length > 0) {
			setShowNotes(true)
		}
	}

	const handleEditNotesConfirm = (notes: string) => {
		try {
			onNotesEdit(selectedRegistrationId, notes)
		} finally {
			setShowNotes(false)
			setSelectedSlotId(-1)
			setSelectedRegistrationId(-1)
		}
	}

	const handleEditNotesCancel = () => {
		setShowNotes(false)
		setSelectedSlotId(-1)
		setSelectedRegistrationId(-1)
	}

	const handleChangeEvent = () => {
		if (selectedSlots?.length > 0) {
			setShowChange(true)
		}
	}

	const handleChangeEventConfirm = (targetEvent: ClubEvent) => {
		try {
			onChangeEvent(selectedRegistrationId, targetEvent.id)
		} finally {
			setShowChange(false)
			setSelectedSlotId(-1)
			setSelectedRegistrationId(-1)
		}
	}

	const handleChangeEventCancel = () => {
		setShowChange(false)
		setSelectedSlotId(-1)
		setSelectedRegistrationId(-1)
	}

	return (
		<div className="row">
			<div className="col-6 col-md-12">
				<div className="card" {...rest}>
					<div className="card-body">
						<h4 className="card-header mb-2">Manage Players</h4>
						<div className="mb-2">
							<button className="btn btn-sm btn-info" onClick={handleAdd}>
								Add Player
							</button>
						</div>
						{reservations.map((res) => (
							<ReservationAdmin
								key={res.slotId}
								reservation={res}
								selected={
									selectedSlotId === res.slotId || selectedRegistrationId === res.registrationId
								}
								onSlotSelect={handleSlotSelect}
								onGroupSelect={handleGroupSelect}
								onDrop={handleDrop}
								onSwap={handleSwap}
								onEditNotes={handleEditNotes}
								onChangeEvent={handleChangeEvent}
							/>
						))}
						<Modal show={showDrop}>
							{selectedSlots.length > 0 && (
								<DropPlayers
									clubEvent={clubEvent}
									slots={selectedSlots}
									onCancel={handleDropCancel}
									onDrop={handleDropConfirm}
									onRefund={handleRefundConfirm}
								/>
							)}
						</Modal>
						<Modal show={showSwap}>
							{selectedSlots[0] && (
								<SwapPlayers
									clubEvent={clubEvent}
									slot={selectedSlots[0]}
									onCancel={handleSwapCancel}
									onSwap={handleSwapConfirm}
								/>
							)}
						</Modal>
						<Modal show={showAdd}>
							<AddPlayer
								clubEvent={clubEvent}
								onCancel={handleAddCancel}
								onAdd={handleAddConfirm}
							/>
						</Modal>
						<Modal show={showNotes}>
							{selectedRegistrationId && (
								<EditNotes
									signedUpBy={
										registrations.find((r) => r.id === selectedRegistrationId)?.signedUpBy ?? ""
									}
									registrationNotes={notes.get(selectedRegistrationId) ?? ""}
									onEdit={handleEditNotesConfirm}
									onCancel={handleEditNotesCancel}
								/>
							)}
						</Modal>
						<Modal show={showChange}>
							{selectedRegistrationId && (
								<ChangeEvent
									onChange={handleChangeEventConfirm}
									onCancel={handleChangeEventCancel}
								/>
							)}
						</Modal>
					</div>
				</div>
			</div>
		</div>
	)
}
