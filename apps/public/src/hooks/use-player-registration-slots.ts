import { useQuery } from "@tanstack/react-query"

import {
	RegistrationSlot,
	RegistrationSlotApiSchema,
	RegistrationSlotData,
} from "../models/registration"
import { getMany } from "../utils/api-client"
import { twoMinutes } from "../utils/app-config"

const mapper = (data: RegistrationSlotData[]) => data.map((s) => new RegistrationSlot(s))

export function usePlayerRegistrationSlots(playerId: number) {
	const endpoint = `registration-slots/?player_id=${playerId}`
	return useQuery({
		queryKey: ["player-registration-slots", playerId],
		queryFn: () => getMany(endpoint, RegistrationSlotApiSchema),
		select: mapper,
		staleTime: twoMinutes,
	})
}
