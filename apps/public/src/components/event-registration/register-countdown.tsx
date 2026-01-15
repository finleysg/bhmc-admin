import { useEffect, useLayoutEffect, useState } from "react"

import { addMinutes } from "date-fns"
import { toast } from "react-toastify"

import { useCounter } from "../../hooks/use-counter"
import { useEventRegistration } from "../../hooks/use-event-registration"

export const RegisterCountdown = ({ doCountdown }: { doCountdown: boolean }) => {
	const [isExpired, setIsExpired] = useState(false)
	const { cancelRegistration, registration } = useEventRegistration()
	const { minutes, seconds } = useCounter(
		registration?.expires ?? addMinutes(new Date(), 5),
		1000,
		doCountdown,
	)

	useEffect(() => {
		if (minutes + seconds <= 0 && doCountdown && !isExpired) {
			setIsExpired(true)
			cancelRegistration("timeout", "new") // We never render this unless it's a new registration
		}
	}, [minutes, seconds, doCountdown, isExpired, cancelRegistration])

	useLayoutEffect(() => {
		if (isExpired) {
			toast.error("The time allowed to complete this registration has passed.", { autoClose: 5000 })
		}
	}, [isExpired])

	if (!registration || !doCountdown) {
		return null
	}

	return (
		<p>
			Time remaining to complete registration:{" "}
			<span className="fw-bold" style={{ color: minutes > 0 ? "black" : "red" }}>
				{minutes}:{seconds.toString().padStart(2, "0")}
			</span>
		</p>
	)
}
