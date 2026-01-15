import { ComponentPropsWithoutRef } from "react"

import { format } from "date-fns"
import { Link } from "react-router-dom"

import { Reservation } from "../../models/reserve"

interface ReservedPlayerProps extends ComponentPropsWithoutRef<"div"> {
	playerRegistration: Reservation
	isLink: boolean
}

export function ReservedPlayer({ playerRegistration, isLink, ...rest }: ReservedPlayerProps) {
	const slot = () => {
		return (
			<div className="reserve-player" {...rest}>
				<p className="text-success" style={{ margin: 0, padding: "5px 0", fontWeight: "bold" }}>
					{playerRegistration.name}
				</p>
				<p className="text-muted" style={{ fontSize: ".75rem", margin: 0 }}>
					Signed up by {playerRegistration.signedUpBy} on{" "}
					{format(playerRegistration.signupDate, "MM/dd/yyyy h:mm aaaa")}
				</p>
			</div>
		)
	}

	if (isLink) {
		return <Link to={`/directory/${playerRegistration.playerId}`}>{slot()}</Link>
	}
	return slot()
}
