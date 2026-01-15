import { useEffect } from "react"

import { useNavigate } from "react-router-dom"

import { CreateAccountButton } from "../components/buttons/create-account-button"
import { LoginButton } from "../components/buttons/login-button"
import { CardContent } from "../components/card/content"
import { OverlaySpinner } from "../components/spinners/overlay-spinner"
import { useAuth } from "../hooks/use-auth"
import { useClubEvents } from "../hooks/use-club-events"
import { EventType } from "../models/codes"
import { currentSeason } from "../utils/app-config"

export function MembershipScreen() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { data: clubEvents } = useClubEvents(currentSeason)

	useEffect(() => {
		if (clubEvents && clubEvents.length > 0) {
			// most recent season registration event
			const [evt] = clubEvents.filter((e) => e.eventType === EventType.Membership).slice(-1)
			if (evt && user.isAuthenticated) {
				navigate(evt.eventUrl)
			}
		}
	}, [clubEvents, navigate, user.isAuthenticated])

	return (
		<div className="content__inner">
			<OverlaySpinner loading={!clubEvents?.length} />
			<CardContent contentKey="membership">
				{!user.isAuthenticated && (
					<div>
						<p className="text-primary">
							You need to have an account with us and be logged in to register for the{" "}
							{currentSeason} season.
						</p>
						<div>
							<CreateAccountButton />
							<LoginButton redirectUrl="/membership" />
						</div>
					</div>
				)}
			</CardContent>
		</div>
	)
}
