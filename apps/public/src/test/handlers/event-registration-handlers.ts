import { http, HttpResponse } from "msw"

import { apiUrl } from "../../utils/api-utils"
import { getTestEvents } from "../data/test-events"

export const eventRegistrationHandlers = [
	http.get(apiUrl("events/"), () => {
		return HttpResponse.json(getTestEvents())
	}),
	// http.get(apiUrl("events/:eventId"), ({ params }) => {
	//   const { eventId } = params
	//   const eventData = getTestEvent(TestEventType.weeknight, "registration")
	//   eventData.id = +eventId
	//   return HttpResponse.json(eventData, { status: 200 })
	// }),
	http.get(apiUrl("registration/"), () => {
		return HttpResponse.json([])
	}),
	http.get(apiUrl("payments/"), () => {
		return HttpResponse.json([])
	}),
	http.get(apiUrl("registration-slots/"), () => {
		return HttpResponse.json([])
	}),
	http.get(apiUrl("players/search/"), () => {
		return HttpResponse.json([])
	}),
]
