import { useQuery } from "@tanstack/react-query"

import {
	RegistrationSlot,
	RegistrationSlotApiSchema,
	RegistrationSlotData,
} from "../models/registration"
import { getMany } from "../utils/api-client"

const mapper = (data: RegistrationSlotData[]) => data.map((s) => new RegistrationSlot(s))

export function useEventRegistrationSlots(eventId?: number) {
	const endpoint = `registration-slots/?event_id=${eventId}`
	return useQuery({
		queryKey: ["event-registration-slots", eventId],
		queryFn: () => getMany(endpoint, RegistrationSlotApiSchema),
		enabled: !!eventId,
		select: mapper,
	})
}
