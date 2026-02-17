"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { differenceInMinutes, isBefore } from "date-fns"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { getEventUrl, RegistrationType } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import type { ClubEventDetail } from "@/lib/types"

interface RegistrationActionsProps {
	event: ClubEventDetail
}

export function RegistrationActions({ event }: RegistrationActionsProps) {
	const { isAuthenticated } = useAuth()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(event.id, player?.id)

	const hasSignedUp = !!registrationData?.registration
	const eventUrl = getEventUrl(event)

	return (
		<div className="flex gap-2">
			<SignUpButton event={event} hasSignedUp={hasSignedUp} eventUrl={eventUrl} />
			<PlayersButton event={event} eventUrl={eventUrl} />
			{isAuthenticated && (
				<ManageButton event={event} hasSignedUp={hasSignedUp} eventUrl={eventUrl} />
			)}
		</div>
	)
}

function SignUpButton({
	event,
	hasSignedUp,
	eventUrl,
}: {
	event: ClubEventDetail
	hasSignedUp: boolean
	eventUrl: string
}) {
	const { isAuthenticated } = useAuth()
	const now = new Date()
	const signupStart = event.priority_signup_start ?? event.signup_start
	const targetDate = signupStart ? new Date(signupStart) : now

	const startCountdown = isBefore(now, targetDate) && differenceInMinutes(targetDate, now) < 60

	if (
		hasSignedUp ||
		!isAuthenticated ||
		event.registration_type === RegistrationType.None ||
		event.registration_window === "past" ||
		event.status === "C"
	) {
		return null
	}

	const isOpen = event.registration_window === "current"
	const destination = event.can_choose ? `${eventUrl}/reserve` : `${eventUrl}/register`

	if (startCountdown) {
		return <CountdownButton targetDate={targetDate} destination={destination} />
	}

	return (
		<Button size="sm" disabled={!isOpen} asChild={isOpen}>
			{isOpen ? <Link href={destination}>Sign Up</Link> : <span>Sign Up</span>}
		</Button>
	)
}

function CountdownButton({
	targetDate,
	destination,
}: {
	targetDate: Date
	destination: string
}) {
	const [remaining, setRemaining] = useState(() => {
		const diff = targetDate.getTime() - Date.now()
		return Math.max(0, Math.floor(diff / 1000))
	})

	useEffect(() => {
		const interval = setInterval(() => {
			const diff = targetDate.getTime() - Date.now()
			const secs = Math.max(0, Math.floor(diff / 1000))
			setRemaining(secs)
			if (secs <= 0) clearInterval(interval)
		}, 1000)
		return () => clearInterval(interval)
	}, [targetDate])

	const minutes = Math.floor(remaining / 60)
	const seconds = remaining % 60

	if (remaining <= 0) {
		return (
			<Button size="sm" asChild>
				<Link href={destination}>Sign Up</Link>
			</Button>
		)
	}

	return (
		<Button size="sm" disabled>
			<span className="font-bold">
				{minutes}:{seconds.toString().padStart(2, "0")}
			</span>
		</Button>
	)
}

function PlayersButton({
	event,
	eventUrl,
}: {
	event: ClubEventDetail
	eventUrl: string
}) {
	const signupStart = event.priority_signup_start ?? event.signup_start
	if (!signupStart) return null

	const canView =
		event.registration_type !== RegistrationType.None &&
		!isBefore(new Date(), new Date(signupStart))

	if (!canView) return null

	return (
		<Button variant="secondary" size="sm" asChild>
			<Link href={`${eventUrl}/registrations`}>Players</Link>
		</Button>
	)
}

function ManageButton({
	event,
	hasSignedUp,
	eventUrl,
}: {
	event: ClubEventDetail
	hasSignedUp: boolean
	eventUrl: string
}) {
	if (!hasSignedUp || event.registration_window === "past") return null

	const paymentsOpen = event.payments_end ? isBefore(new Date(), new Date(event.payments_end)) : false

	if (!paymentsOpen) return null

	return (
		<Button variant="outline" size="sm" asChild>
			<Link href={`${eventUrl}/manage`}>Manage</Link>
		</Button>
	)
}
