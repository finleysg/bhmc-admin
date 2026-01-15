import { isNumber } from "lodash"
import { Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom"

import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useClubEvent } from "../../hooks/use-club-event"
import { ClubEvent } from "../../models/club-event"
import { EventAdminSubheader } from "./event-admin-subhead"

type ContextType = { clubEvent: ClubEvent }

export function EventAdmin() {
	const { eventId } = useParams()
	const navigate = useNavigate()
	const { data: clubEvent, status } = useClubEvent(eventId ? +eventId : null)

	if (!eventId || !isNumber(+eventId)) {
		navigate("/admin")
	}

	return (
		<>
			{eventId && (
				<div>
					<OverlaySpinner loading={status === "pending"} />
					{clubEvent && (
						<>
							<EventAdminSubheader clubEvent={clubEvent} />
							<Outlet context={{ clubEvent } satisfies ContextType} />
						</>
					)}
				</div>
			)}
		</>
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEventAdmin() {
	return useOutletContext<ContextType>()
}
