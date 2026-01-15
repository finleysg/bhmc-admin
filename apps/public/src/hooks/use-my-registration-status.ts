import { useAuth } from "./use-auth"
import { useMyEvents } from "./use-my-events"

export function useMyRegistrationStatus(eventId?: number) {
	const { user } = useAuth()
	const { data: myEvents } = useMyEvents()

	if (!eventId) {
		return false
	} else if (user.isAuthenticated && myEvents) {
		return myEvents.indexOf(eventId) >= 0
	}
	return false
}
