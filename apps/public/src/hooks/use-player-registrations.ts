import { useQuery } from "@tanstack/react-query"

import { Registration, RegistrationApiSchema, RegistrationData } from "../models/registration"
import { getMany, getOne } from "../utils/api-client"
import { twoMinutes } from "../utils/app-config"

const registrationsMapper = (data: RegistrationData[]) => data.map((r) => new Registration(r))
const registrationMapper = (data: RegistrationData | undefined) =>
	data ? new Registration(data) : null

export function usePlayerRegistrations(playerId?: number, season?: number) {
	const endpoint = `registration/?player_id=${playerId}` + (season ? `&seasons=${season}` : "")
	return useQuery({
		queryKey: ["player-registrations", playerId],
		queryFn: () => getMany(endpoint, RegistrationApiSchema),
		select: registrationsMapper,
		staleTime: twoMinutes,
		enabled: playerId !== undefined && playerId > 0,
	})
}

export function usePlayerRegistration(playerId?: number, eventId?: number) {
	const endpoint = `registration/?player_id=${playerId}&event_id=${eventId}`

	return useQuery({
		queryKey: ["player-registration", playerId, eventId],
		queryFn: () => getOne(endpoint, RegistrationApiSchema),
		select: registrationMapper,
		staleTime: twoMinutes,
		enabled: playerId !== undefined && playerId > 0 && eventId !== undefined && eventId > 0,
	})
}
