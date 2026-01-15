import { useQuery } from "@tanstack/react-query"

import { RegistrationSlot, RegistrationSlotApiSchema } from "../models/registration"
import { getMany } from "../utils/api-client"
import { twoMinutes } from "../utils/app-config"

export function usePlayerRegistrationSlots(playerId: number) {
	const endpoint = `registration-slots/?player_id=${playerId}`
	return useQuery({
		queryKey: ["player-registration-slots", playerId],
		queryFn: () => getMany(endpoint, RegistrationSlotApiSchema),
		select: (data) => data.map((s) => new RegistrationSlot(s)),
		staleTime: twoMinutes,
	})
}
