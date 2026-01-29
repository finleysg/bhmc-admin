import { useQuery } from "@tanstack/react-query"

import { RegistrationStatus } from "../models/codes"
import { RegistrationSlotApiSchema, RegistrationSlotData } from "../models/registration"
import { getMany } from "../utils/api-client"
import { currentSeason } from "../utils/app-config"
import { useAuth } from "./use-auth"
import { useMyPlayerRecord } from "./use-my-player-record"

const mapper = (data: RegistrationSlotData[]) =>
	data
		.filter(
			(s) => s.status === RegistrationStatus.Reserved || s.status === RegistrationStatus.Processing,
		)
		.map((e) => e.event)

export function useMyEvents() {
	const { user } = useAuth()
	const { data: player } = useMyPlayerRecord()

	const enable = user.isAuthenticated && player !== undefined && player.id > 0
	const endpoint = `registration-slots/?player_id=${player?.id}&seasons=${currentSeason}`

	return useQuery({
		queryKey: ["my-events"],
		queryFn: () => getMany(endpoint, RegistrationSlotApiSchema),
		select: mapper,
		enabled: enable,
	})
}
