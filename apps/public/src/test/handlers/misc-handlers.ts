import { http, HttpResponse } from "msw"

import { apiUrl } from "../../utils/api-utils"
import { newsBuilder } from "../data/misc"

export const dataHandlers = [
	http.get(apiUrl("news"), () => {
		const news = newsBuilder.many(3)
		return HttpResponse.json(news)
	}),
	http.get(apiUrl("tags"), () => {
		return HttpResponse.json([
			{ id: 1, name: "Tag1" },
			{ id: 2, name: "Tag2" },
			{ id: 3, name: "Tag3" },
		])
	}),
]
