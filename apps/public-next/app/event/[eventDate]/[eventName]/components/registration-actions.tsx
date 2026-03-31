"use client"

import { useState } from "react"
import Link from "next/link"
import { isBefore } from "date-fns"

import { Info, Users } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
	getEventUrl,
	getSignUpUnavailableReason,
	RegistrationType,
	shouldShowSignUpButton,
	type SessionSpots,
} from "@/lib/event-utils"
import { RegistrationStatus } from "@/lib/registration/types"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import type { ClubEventDetail } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RegistrationActionsProps {
	event: ClubEventDetail
	isEventFull?: boolean
	sessionSpots?: SessionSpots[]
}

export function RegistrationActions({
	event,
	isEventFull,
	sessionSpots,
}: RegistrationActionsProps) {
	const { isAuthenticated } = useAuth()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(event.id, player?.id)

	const hasSignedUp = !!registrationData?.registration?.slots.some(
		(s) => s.status === RegistrationStatus.Reserved || s.status === RegistrationStatus.Processing,
	)
	const eventUrl = getEventUrl(event)

	const sessions = event.sessions ?? []
	const showSessionPicker =
		!event.can_choose && sessions.length > 0 && !hasSignedUp && isAuthenticated

	return (
		<div className="flex flex-col gap-2">
			<div className="flex gap-2">
				<PortalButton event={event} />
				<PlayersButton event={event} eventUrl={eventUrl} />
				{!showSessionPicker && (
					<SignUpButton
						event={event}
						hasSignedUp={hasSignedUp}
						eventUrl={eventUrl}
						player={player}
						isEventFull={isEventFull}
					/>
				)}
				{isAuthenticated && (
					<ManageButton event={event} hasSignedUp={hasSignedUp} eventUrl={eventUrl} />
				)}
			</div>
			{showSessionPicker && (
				<SessionPicker
					event={event}
					eventUrl={eventUrl}
					sessionSpots={sessionSpots ?? []}
					player={player}
					isEventFull={isEventFull}
				/>
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
	isEventFull,
}: {
	event: ClubEventDetail
	hasSignedUp: boolean
	eventUrl: string
	player?: { last_season?: number | null }
	isEventFull?: boolean
}) {
	const { isAuthenticated } = useAuth()

	if (
		hasSignedUp ||
		!isAuthenticated ||
		isEventFull ||
		!shouldShowSignUpButton(event, new Date())
	) {
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

function SessionPicker({
	event,
	eventUrl,
	sessionSpots,
	player,
	isEventFull,
}: {
	event: ClubEventDetail
	eventUrl: string
	sessionSpots: SessionSpots[]
	player?: { last_season?: number | null }
	isEventFull?: boolean
}) {
	const { isAuthenticated } = useAuth()
	const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)

	if (isEventFull || !isAuthenticated || !shouldShowSignUpButton(event, new Date())) {
		return null
	}

	if (
		event.registration_type === RegistrationType.ReturningMembersOnly &&
		player?.last_season !== event.season - 1
	) {
		return null
	}

	return (
		<div className="space-y-3">
			<p className="text-sm font-medium text-muted-foreground">Choose a session:</p>
			<div className="grid gap-2 sm:grid-cols-2">
				{sessionSpots.map((session) => {
					const isFull = session.availableSpots <= 0
					const isSelected = selectedSessionId === session.sessionId
					return (
						<button
							key={session.sessionId}
							type="button"
							disabled={isFull}
							onClick={() => setSelectedSessionId(session.sessionId)}
							className={cn(
								"flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition-colors",
								isSelected
									? "border-primary bg-primary/5 ring-1 ring-primary"
									: "border-border hover:border-primary/50",
								isFull && "cursor-not-allowed opacity-50",
							)}
						>
							<span className="font-medium">{session.sessionName}</span>
							<span className="flex items-center gap-1 text-xs text-muted-foreground">
								<Users className="size-3" />
								{isFull
									? "Full"
									: `${session.availableSpots} of ${session.totalSpots} spots available`}
							</span>
						</button>
					)
				})}
			</div>
			<Button
				variant="accent"
				size="sm"
				disabled={!selectedSessionId}
				asChild={!!selectedSessionId}
			>
				{selectedSessionId ? (
					<Link href={`${eventUrl}/register?session=${selectedSessionId}`}>Sign Up</Link>
				) : (
					<span>Sign Up</span>
				)}
			</Button>
		</div>
	)
}

export function RegistrationBanner({
	event,
	isEventFull,
}: {
	event: ClubEventDetail
	isEventFull?: boolean
}) {
	const { isAuthenticated } = useAuth()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(event.id, player?.id)

	const hasSignedUp = !!registrationData?.registration?.slots.some(
		(s) => s.status === RegistrationStatus.Reserved || s.status === RegistrationStatus.Processing,
	)
	const reason = getSignUpUnavailableReason({
		event,
		isAuthenticated,
		hasSignedUp,
		playerLastSeason: player?.last_season,
		isEventFull,
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
