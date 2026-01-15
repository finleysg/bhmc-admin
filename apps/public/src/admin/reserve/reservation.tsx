import { ComponentPropsWithoutRef } from "react"

import { format } from "date-fns"

import { Reservation } from "../../models/reserve"

interface ReservationAdminProps extends Omit<ComponentPropsWithoutRef<"div">, "onDrop"> {
	reservation: Reservation
	selected: boolean
	onSlotSelect: (reservation: Reservation) => void
	onGroupSelect: (reservation: Reservation) => void
	onDrop: () => void
	onSwap: () => void
	onEditNotes: () => void
	onChangeEvent: () => void
}

export function ReservationAdmin({
	reservation,
	selected,
	onSlotSelect,
	onGroupSelect,
	onDrop,
	onSwap,
	onEditNotes,
	onChangeEvent,
	...rest
}: ReservationAdminProps) {
	return (
		<div {...rest}>
			<div className="d-flex mb-2">
				<div className="reservation">
					<button className="btn btn-sm btn-warning" disabled={!selected} onClick={onSwap}>
						Swap
					</button>
					<button className="btn btn-sm btn-warning" disabled={!selected} onClick={onChangeEvent}>
						Change
					</button>
					<button className="btn btn-sm btn-danger" disabled={!selected} onClick={onDrop}>
						Drop
					</button>
					<button className="btn btn-sm btn-info" disabled={!selected} onClick={onEditNotes}>
						Notes
					</button>
				</div>
				<div>
					<button
						className={selected ? "btn btn-link text-success fw-bold" : "btn btn-link"}
						onClick={() => onGroupSelect(reservation)}
					>
						{reservation.registrationId}
					</button>
				</div>
				<div>
					<button
						className={selected ? "btn btn-link text-success fw-bold" : "btn btn-link"}
						onClick={() => onSlotSelect(reservation)}
					>
						{reservation.name}
					</button>
				</div>
				<div className="text-secondary pt-2">
					Signed up by {reservation.signedUpBy} on{" "}
					{format(reservation.signupDate, "MM/dd/yyyy h:mm aaaa")}
				</div>
			</div>
		</div>
	)
}
