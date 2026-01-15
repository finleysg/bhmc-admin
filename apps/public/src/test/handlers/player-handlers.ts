import { http, HttpResponse } from "msw"

import { PlayerApiData } from "../../models/player"
import { apiUrl } from "../../utils/api-utils"
import { playerBuilder } from "../data/account"

export const playerHandlers = [
	http.get(apiUrl("players/"), ({ request }) => {
		const url = new URL(request.url)
		const email = url.searchParams.get("email")
		const player = playerBuilder.one({ overrides: { email: email?.toString() } })
		return HttpResponse.json(player)
	}),
	http.put(apiUrl("players/:id/"), async ({ request }) => {
		const body = (await request.json()) as PlayerApiData
		return HttpResponse.json(body, { status: 200 })
	}),
]
