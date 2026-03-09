"use client"

import Link from "next/link"
import { isBefore } from "date-fns"

import { Info } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
	getEventUrl,
	getSignUpUnavailableReason,
	RegistrationType,
	shouldShowSignUpButton,
} from "@/lib/event-utils"
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
			<PortalButton event={event} />
			<PlayersButton event={event} eventUrl={eventUrl} />
			<SignUpButton event={event} hasSignedUp={hasSignedUp} eventUrl={eventUrl} player={player} />
			{isAuthenticated && (
				<ManageButton event={event} hasSignedUp={hasSignedUp} eventUrl={eventUrl} />
			)}
		</div>
	)
}

function PortalButton({ event }: { event: ClubEventDetail }) {
	if (!event.portal_url) return null

	return (
		<Button variant="secondary" size="sm" asChild>
			<a href={event.portal_url} target="_blank" rel="noopener noreferrer">
				Leaderboard
			</a>
		</Button>
	)
}

function SignUpButton({
	event,
	hasSignedUp,
	eventUrl,
	player,
}: {
	event: ClubEventDetail
	hasSignedUp: boolean
	eventUrl: string
	player?: { last_season?: number | null }
}) {
	const { isAuthenticated } = useAuth()

	if (hasSignedUp || !isAuthenticated || !shouldShowSignUpButton(event, new Date())) {
		return null
	}

	if (
		event.registration_type === RegistrationType.ReturningMembersOnly &&
		player?.last_season !== event.season - 1
	) {
		return null
	}

	const destination = event.can_choose ? `${eventUrl}/reserve` : `${eventUrl}/register`

	return (
		<Button variant="accent" size="sm" asChild>
			<Link href={destination}>Sign Up</Link>
		</Button>
	)
}

function PlayersButton({ event, eventUrl }: { event: ClubEventDetail; eventUrl: string }) {
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

	const paymentsOpen = event.payments_end
		? isBefore(new Date(), new Date(event.payments_end))
		: false

	if (!paymentsOpen) return null

	return (
		<Button variant="accent" size="sm" asChild>
			<Link href={`${eventUrl}/manage`}>Manage</Link>
		</Button>
	)
}

export function RegistrationBanner({ event }: { event: ClubEventDetail }) {
	const { isAuthenticated } = useAuth()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(event.id, player?.id)

	const hasSignedUp = !!registrationData?.registration
	const reason = getSignUpUnavailableReason({
		event,
		isAuthenticated,
		hasSignedUp,
		playerLastSeason: player?.last_season,
	})

	if (!reason) return null

	const bg = hasSignedUp ? "bg-secondary/10" : "bg-primary/10"

	return (
		<Alert className={`${bg} border-none`}>
			<Info />
			<AlertDescription>{reason}</AlertDescription>
		</Alert>
	)
}
