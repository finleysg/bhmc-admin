import { useQuery } from "@tanstack/react-query"

import { RegistrationStatus } from "../models/codes"
import { Registration, RegistrationApiSchema, RegistrationData } from "../models/registration"
import { getMany } from "../utils/api-client"
import { twoMinutes } from "../utils/app-config"

const mapper = (data: RegistrationData[]) => {
	return data
		.filter((reg) => reg.slots[0]?.status === RegistrationStatus.Reserved)
		.map((d) => new Registration(d))
}

export function useEventRegistrations(eventId?: number) {
	const endpoint = `registration/?event_id=${eventId}`
	return useQuery({
		queryKey: ["event-registrations", eventId],
		queryFn: () => getMany(endpoint, RegistrationApiSchema),
		enabled: !!eventId,
		select: mapper,
		staleTime: twoMinutes,
	})
}
