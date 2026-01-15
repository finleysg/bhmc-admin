import { useMutation, useQueryClient } from "@tanstack/react-query"

import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

interface RegistrationUpdateArgs {
	registrationId: number
	notes: string
}

export function useRegistrationUpdate() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ registrationId, notes }: RegistrationUpdateArgs) => {
			return httpClient(apiUrl(`registration/${registrationId}`), {
				method: "PATCH",
				body: JSON.stringify({
					notes: notes,
				}),
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["event-registrations"] })
			queryClient.invalidateQueries({ queryKey: ["player-registration"] })
		},
	})
}

/**
 * Move a registration from one event to another.
 * @returns
 */
export function useChangeEvent() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			registrationId,
			targetEventId,
		}: {
			registrationId: number
			targetEventId: number
		}) => {
			return httpClient(apiUrl(`registration/${registrationId}/move_registration`), {
				method: "PUT",
				body: JSON.stringify({ target_event_id: targetEventId }),
			})
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["event-registrations"] })
		},
	})
}
