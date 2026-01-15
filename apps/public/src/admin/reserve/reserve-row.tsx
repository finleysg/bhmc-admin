import { ComponentPropsWithoutRef } from "react"

import { ReserveGroup, ReserveSlot } from "../../models/reserve"
import { ReserveCardAdmin } from "./reserve-card"

export type SelectStatus = "none" | "slot" | "player" | "group"

interface ReserveRowAdminProps extends Omit<ComponentPropsWithoutRef<"div">, "onDrop"> {
	courseName: string
	group: ReserveGroup
	moveStarted: boolean
	selectStatus: SelectStatus
	onSlotSelect: (slot: ReserveSlot) => void
	onGroupSelect: (registrationId: number) => void
	onAdd: () => void
	onDrop: () => void
	onSwap: () => void
	onMove: () => void
	onMoveConfirm: (group: ReserveGroup) => void
}

export function ReserveRowAdmin({
	courseName,
	group,
	selectStatus,
	moveStarted,
	onSlotSelect,
	onGroupSelect,
	onAdd,
	onDrop,
	onSwap,
	onMove,
	onMoveConfirm,
	...rest
}: ReserveRowAdminProps) {
	const disableAdd = group.selectedSlotIds().length === 0 || selectStatus !== "slot" || moveStarted
	const disableMove = group.selectedSlotIds().length === 0 || selectStatus === "slot"
	const disableSwap =
		group.selectedSlotIds().length !== 1 || selectStatus !== "player" || moveStarted
	const disableDrop = group.selectedSlotIds().length === 0 || selectStatus === "slot" || moveStarted

	return (
		<div className={`reserve-group reserve-group__${courseName.toLowerCase()}`} {...rest}>
			<div className="reserve-group-name" style={{ minWidth: "360px" }}>
				<span>{group.name}</span>
				<button className="btn btn-sm btn-primary" disabled={disableMove} onClick={onMove}>
					{moveStarted ? "Cancel" : "Move"}
				</button>
				<button className="btn btn-sm btn-success" disabled={disableAdd} onClick={onAdd}>
					Add
				</button>
				<button className="btn btn-sm btn-warning" disabled={disableSwap} onClick={onSwap}>
					Swap
				</button>
				<button className="btn btn-sm btn-danger" disabled={disableDrop} onClick={onDrop}>
					Drop
				</button>
			</div>
			{group.slots.map((slot) => (
				<ReserveCardAdmin
					key={slot.id}
					reserveSlot={slot}
					moveStarted={moveStarted}
					onSlotSelect={() => onSlotSelect(slot)}
					onGroupSelect={() => onGroupSelect(slot.registrationId!)}
					onMoveSelect={() => onMoveConfirm(group)}
				/>
			))}
		</div>
	)
}
