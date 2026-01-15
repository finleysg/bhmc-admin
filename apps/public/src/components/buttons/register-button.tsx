import { ComponentPropsWithoutRef } from "react"

import { differenceInMinutes, isBefore } from "date-fns"

import { useCounter } from "../../hooks/use-counter"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { EventStatusType, RegistrationType } from "../../models/codes"
import { ClubEventProps } from "../../models/common-props"

interface RegisterButtonProps extends ComponentPropsWithoutRef<"button"> {
	hasSignedUp: boolean
	now?: Date
}

export function RegisterButton({
	clubEvent,
	hasSignedUp,
	onClick,
	...rest
}: RegisterButtonProps & ClubEventProps) {
	const currentTime = new Date()
	const targetDate = clubEvent.prioritySignupStart ?? clubEvent.signupStart ?? currentTime
	const startCountdown =
		isBefore(currentTime, targetDate) && differenceInMinutes(targetDate, currentTime) < 60

	const { data: player } = useMyPlayerRecord()
	const { minutes, seconds } = useCounter(targetDate)

	if (
		hasSignedUp ||
		clubEvent.registrationType === RegistrationType.None ||
		clubEvent.registrationWindow === "past" ||
		clubEvent.status === EventStatusType.Canceled
	) {
		return null
	}

	const isDisabled =
		!clubEvent.playerCanRegister(currentTime, player) || !clubEvent.playerIsEligible(player)
	const buttonText =
		startCountdown && minutes + seconds > 0 ? (
			<span className="fw-bold">
				{minutes}:{seconds.toString().padStart(2, "0")}
			</span>
		) : (
			<span>Sign Up</span>
		)

	return (
		<button
			className="btn btn-warning btn-sm"
			style={{ minWidth: "80px" }}
			onClick={onClick}
			disabled={isDisabled}
			{...rest}
		>
			{buttonText}
		</button>
	)
}
