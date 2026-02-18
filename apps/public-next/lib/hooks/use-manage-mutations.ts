import { useMutation, useQueryClient } from "@tanstack/react-query"

function invalidateRegistrationQueries(
	queryClient: ReturnType<typeof useQueryClient>,
	eventId?: number,
) {
	void queryClient.invalidateQueries({
		queryKey: eventId ? ["event-registrations", eventId] : ["event-registrations"],
	})
	void queryClient.invalidateQueries({
		queryKey: eventId ? ["event-registration-slots", eventId] : ["event-registration-slots"],
	})
	void queryClient.invalidateQueries({ queryKey: ["player-registration"] })
}

interface DropPlayersArgs {
	registrationId: number
	slotIds: number[]
}

export function useDropPlayers(eventId?: number) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ registrationId, slotIds }: DropPlayersArgs) => {
			const response = await fetch(`/api/registration/${registrationId}/drop`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source_slots: slotIds }),
			})
			if (!response.ok) {
				const body = await response.text()
				throw new Error(body || "Failed to drop players")
			}
		},
		onSuccess: () => invalidateRegistrationQueries(queryClient, eventId),
	})
}

interface MovePlayersArgs {
	registrationId: number
	sourceSlotIds: number[]
	destinationSlotIds: number[]
}

export function useMovePlayers(eventId?: number) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ registrationId, sourceSlotIds, destinationSlotIds }: MovePlayersArgs) => {
			const response = await fetch(`/api/registration/${registrationId}/move`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					source_slots: sourceSlotIds,
					destination_slots: destinationSlotIds,
				}),
			})
			if (!response.ok) {
				const body = await response.text()
				throw new Error(body || "Failed to move group")
			}
		},
		onSuccess: () => invalidateRegistrationQueries(queryClient, eventId),
	})
}

interface SwapPlayersArgs {
	slotId: number
	playerId: number
}

export function useSwapPlayers(eventId?: number) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ slotId, playerId }: SwapPlayersArgs) => {
			const response = await fetch(`/api/registration/slots/${slotId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ playerId }),
			})
			if (!response.ok) {
				const body = await response.text()
				throw new Error(body || "Failed to replace player")
			}
		},
		onSuccess: () => invalidateRegistrationQueries(queryClient, eventId),
	})
}

interface RegistrationNotesArgs {
	registrationId: number
	notes: string
}

export function useRegistrationNotes(eventId?: number) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ registrationId, notes }: RegistrationNotesArgs) => {
			const response = await fetch(`/api/registration/${registrationId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notes }),
			})
			if (!response.ok) {
				const body = await response.text()
				throw new Error(body || "Failed to update notes")
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: eventId ? ["event-registrations", eventId] : ["event-registrations"],
			})
			void queryClient.invalidateQueries({ queryKey: ["player-registration"] })
		},
	})
}
