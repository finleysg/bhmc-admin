/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { ComponentPropsWithoutRef } from "react"

import { RegistrationStatus } from "../../models/codes"
import { ReserveSlot } from "../../models/reserve"

interface ReserveCardAdminProps extends ComponentPropsWithoutRef<"div"> {
	reserveSlot: ReserveSlot
	moveStarted: boolean
	onGroupSelect: () => void
	onMoveSelect: () => void
	onSlotSelect: () => void
}

export function ReserveCardAdmin({
	reserveSlot,
	moveStarted,
	onGroupSelect,
	onMoveSelect,
	onSlotSelect,
	...rest
}: ReserveCardAdminProps) {
	if (!moveStarted) {
		if (reserveSlot.status === RegistrationStatus.Reserved) {
			return (
				<div className={reserveSlot.deriveClass()} {...rest}>
					<span style={{ cursor: "pointer" }} onClick={onSlotSelect}>
						{reserveSlot.playerName}
					</span>{" "}
					<span style={{ cursor: "pointer" }} onClick={onGroupSelect}>
						[{reserveSlot.registrationId}]
					</span>
				</div>
			)
		} else if (reserveSlot.status === RegistrationStatus.Available) {
			return (
				<div
					className={reserveSlot.deriveClass()}
					style={{ cursor: "pointer" }}
					onClick={onSlotSelect}
					{...rest}
				>
					{reserveSlot.statusName}
				</div>
			)
		} else {
			return (
				<div className={reserveSlot.deriveClass()} {...rest}>
					{reserveSlot.statusName}
				</div>
			)
		}
	} else {
		if (reserveSlot.status === RegistrationStatus.Reserved) {
			return (
				<div className={reserveSlot.deriveClass()} {...rest}>
					<span>{reserveSlot.playerName}</span> <span>[{reserveSlot.registrationId}]</span>
				</div>
			)
		} else {
			return (
				<div
					className={reserveSlot.deriveClass()}
					style={{ cursor: "move" }}
					onClick={onMoveSelect}
					{...rest}
				>
					open
				</div>
			)
		}
	}
}
