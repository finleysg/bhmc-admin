import { useQuery } from "@tanstack/react-query"

import { RegistrationStatus } from "../models/codes"
import { RegistrationSlotApiSchema, RegistrationSlotData } from "../models/registration"
import { getMany } from "../utils/api-client"
import { currentSeason, twoMinutes } from "../utils/app-config"

const mapper = (data: RegistrationSlotData[]) =>
	data.filter((d) => d.status === RegistrationStatus.Reserved).map((r) => r.event)

export function usePlayerEvents(playerId: number) {
	const endpoint = `registration-slots/?player_id=${playerId}&seasons=${currentSeason}&seasons=${currentSeason - 1}`

	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<RegistrationSlotData>(endpoint, RegistrationSlotApiSchema),
		select: mapper,
		staleTime: twoMinutes,
	})
}
