import { useQuery } from "@tanstack/react-query"

import { RegistrationSlot, RegistrationSlotApiSchema } from "../models/registration"
import { getMany } from "../utils/api-client"

export function useOpenSlots(eventId: number, holeId: number, startingOrder: number) {
	const endpoint = `registration-slots/?event_id=${eventId}&hole_id=${holeId}&starting_order=${startingOrder}&is_open=True`
	return useQuery({
		queryKey: ["open-slots", eventId, holeId, startingOrder],
		queryFn: () => getMany(endpoint, RegistrationSlotApiSchema),
		enabled: !!eventId && !!holeId && startingOrder != null,
		staleTime: Infinity,
		gcTime: 0,
		select: (data) => data.map((s) => new RegistrationSlot(s)),
	})
}
