import { ComponentPropsWithoutRef, useState } from "react"

import { toast } from "react-toastify"

import { Modal } from "../../components/dialog/modal"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { ClubEvent } from "../../models/club-event"
import { Player } from "../../models/player"
import { createRefunds, RefundData } from "../../models/refund"
import { ReserveGroup, ReserveSlot, ReserveTable } from "../../models/reserve"
import { AddPlayer } from "./add-player"
import { DropPlayers } from "./drop-players"
import { ReserveRowAdmin, SelectStatus } from "./reserve-row"
import { SwapPlayers } from "./swap-players"

interface ReserveGridAdminProps extends Omit<ComponentPropsWithoutRef<"div">, "onDrop"> {
	clubEvent: ClubEvent
	table: ReserveTable
	onRegister: (
		slot: ReserveSlot,
		playerId: number,
		feeIds: number[],
		isMoneyOwed: boolean,
		notes: string,
	) => void
	onMove: (
		registrationId: number,
		sourceSlots: ReserveSlot[],
		destinationSlots: ReserveSlot[],
	) => void
	onDrop: (registrationId: number, slotIds: number[], refunds: Map<number, RefundData>) => void
	onRefund: (refunds: Map<number, RefundData>) => void
	onSwap: (slot: ReserveSlot, newPlayerId: number) => void
}

export function ReserveGridAdmin({
	clubEvent,
	table,
	onRegister,
	onMove,
	onDrop,
	onRefund,
	onSwap,
	...rest
}: ReserveGridAdminProps) {
	const [selectedSlots, updateSelectedSlots] = useState<ReserveSlot[]>([])
	const [selectedRegistration, setSelectedRegistration] = useState(0)
	const [selectStatus, setSelectStatus] = useState<SelectStatus>("none")
	const [isMoving, setIsMoving] = useState(false)
	const [showAdd, setShowAdd] = useState(false)
	const [showDrop, setShowDrop] = useState(false)
	const [showSwap, setShowSwap] = useState(false)

	const handleSlotSelect = (slot: ReserveSlot) => {
		if (slot.registrationId) {
			setSelectedRegistration(slot.registrationId)
			setSelectStatus("player")
		} else {
			setSelectedRegistration(0)
			setSelectStatus("slot")
		}
		const currentlySelected: ReserveSlot[] = []
		updateSelectedSlots(currentlySelected) // clears previous selections
		slot.selected = !slot.selected
		if (slot.selected) {
			currentlySelected.push(slot)
		} else {
			setSelectStatus("none")
		}
		updateSelectedSlots(currentlySelected)
	}

	const handleGroupSelect = (registrationId: number) => {
		setSelectedRegistration(registrationId)
		setSelectStatus("group")
		const slots = table.findSlotsByRegistrationId(registrationId)
		const currentlySelected: ReserveSlot[] = []
		updateSelectedSlots(currentlySelected) // clears previous selections
		slots.forEach((slot) => {
			slot.selected = true
			currentlySelected.push(slot)
		})
		if (currentlySelected.length === 0) {
			setSelectStatus("none")
		}
		updateSelectedSlots(currentlySelected)
	}

	const handleAdd = () => {
		if (selectedSlots?.length === 1) {
			setShowAdd(true)
		}
	}

	const handleAddConfirm = (
		player: Player,
		feeIds: number[],
		isMoneyOwed: boolean,
		notes: string,
	) => {
		try {
			onRegister(selectedSlots[0], player.id, feeIds, isMoneyOwed, notes)
		} finally {
			setShowAdd(false)
			updateSelectedSlots([])
			setSelectStatus("none")
		}
	}

	const handleAddCancel = () => {
		setShowAdd(false)
		updateSelectedSlots([])
		setSelectStatus("none")
	}

	const handleDrop = () => {
		if (selectedSlots?.length > 0) {
			setShowDrop(true)
		}
	}

	const handleDropConfirm = (dropSlots: ReserveSlot[], dropNotes: string) => {
		try {
			const slotIds = dropSlots.map((slot) => slot.id)
			const refunds = createRefunds(dropSlots, dropNotes)
			onDrop(selectedRegistration, slotIds, refunds)
		} finally {
			setShowDrop(false)
			updateSelectedSlots([])
			setSelectStatus("none")
		}
	}

	const handleRefundConfirm = (slots: ReserveSlot[], notes: string) => {
		try {
			const refunds = createRefunds(slots, notes)
			onRefund(refunds)
		} finally {
			setShowDrop(false)
			updateSelectedSlots([])
			setSelectStatus("none")
		}
	}

	const handleDropCancel = () => {
		setShowDrop(false)
		updateSelectedSlots([])
		setSelectStatus("none")
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
			updateSelectedSlots([])
			setSelectStatus("none")
		}
	}

	const handleSwapCancel = () => {
		setShowSwap(false)
		updateSelectedSlots([])
		setSelectStatus("none")
	}

	const handleMove = () => {
		if (selectedSlots?.length > 0) {
			if (!isMoving) {
				setIsMoving(true)
			} else {
				setIsMoving(false)
				updateSelectedSlots([])
				setSelectStatus("none")
			}
		}
	}

	const handleMoveConfirm = (group: ReserveGroup) => {
		const availableSlots = group.slots.filter((slot) => slot.status === "A")
		if (selectedSlots.length > availableSlots.length) {
			toast.error("There is not enough room!")
		} else {
			try {
				onMove(selectedRegistration, selectedSlots, availableSlots.slice(0, selectedSlots.length))
			} finally {
				setIsMoving(false)
				updateSelectedSlots([])
				setSelectStatus("none")
			}
		}
	}

	// ensure the selected-slot state is applied
	if (table) {
		table.applySelectedSlots(selectedSlots)
	}

	return (
		<div className="card p-4" {...rest}>
			<OverlaySpinner loading={!table} />
			{Boolean(table) &&
				table.groups.map((group) => (
					<ReserveRowAdmin
						key={group.name}
						courseName={table.course.name}
						group={group}
						moveStarted={isMoving}
						selectStatus={selectStatus}
						onSlotSelect={handleSlotSelect}
						onGroupSelect={handleGroupSelect}
						onAdd={handleAdd}
						onDrop={handleDrop}
						onSwap={handleSwap}
						onMove={handleMove}
						onMoveConfirm={handleMoveConfirm}
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
				<AddPlayer clubEvent={clubEvent} onCancel={handleAddCancel} onAdd={handleAddConfirm} />
			</Modal>
		</div>
	)
}
