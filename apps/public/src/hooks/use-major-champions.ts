import { useQuery } from "@tanstack/react-query"

import { ClubEvent } from "../models/club-event"
import { MajorChampion, MajorChampionApiSchema, MajorChampionData } from "../models/major-champion"
import { getMany } from "../utils/api-client"

export function useChampions(season: number) {
	return useQuery({
		queryKey: ["champions", season],
		queryFn: () =>
			getMany<MajorChampionData>(`champions/?season=${season}`, MajorChampionApiSchema),
		select: (data) => data.map((champ) => new MajorChampion(champ)),
	})
}

export function useEventChampions(clubEvent: ClubEvent) {
	return useQuery({
		queryKey: ["champions", clubEvent.season, clubEvent.id],
		queryFn: () =>
			getMany<MajorChampionData>(`champions/?event=${clubEvent.id}`, MajorChampionApiSchema),
		select: (data) => data.map((champ) => new MajorChampion(champ)),
	})
}
