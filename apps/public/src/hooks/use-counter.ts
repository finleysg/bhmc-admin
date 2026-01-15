import { useState } from "react"

import { useInterval } from "usehooks-ts"

export const useCounter = (
	targetDate: string | number | Date,
	timerInterval: number = 1000,
	enabled: boolean = true,
) => {
	const timeRemaining = new Date(targetDate).getTime()

	const [deadline, setDeadline] = useState(timeRemaining - new Date().getTime())

	useInterval(
		() => {
			setDeadline(timeRemaining - new Date().getTime())
		},
		// Delay in milliseconds or null to stop it
		enabled ? timerInterval : null,
	)

	return displayValues(deadline)
}

const displayValues = (msRemaining: number) => {
	if (msRemaining < 0) {
		return { days: 0, hours: 0, minutes: 0, seconds: 0 }
	}

	const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24))
	const hours = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
	const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
	const seconds = Math.floor((msRemaining % (1000 * 60)) / 1000)

	return { days, hours, minutes, seconds }
}
