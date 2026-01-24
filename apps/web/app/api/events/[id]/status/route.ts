import { NextRequest, NextResponse } from "next/server"

import { ClubEvent } from "@repo/domain/types"

interface AvailableSpotsResponse {
	availableSpots: number
	totalSpots: number
}

interface DocumentsResponse {
	id: number
	event: number | null
}

export interface EventStatusInfo {
	event: ClubEvent
	documentsCount: number
	availableSpots: number
	totalSpots: number
}

function getAuthToken(request: NextRequest): string | null {
	const cookie = request.cookies.get("access_token")
	return cookie?.value || null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	const token = getAuthToken(request)
	if (!token) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const djangoApiUrl = process.env.DJANGO_API_URL
	const nestApiUrl = process.env.API_URL

	if (!djangoApiUrl || !nestApiUrl) {
		return NextResponse.json({ error: "API URLs not configured" }, { status: 500 })
	}

	const headers = {
		Authorization: `Token ${token}`,
		"Content-Type": "application/json",
	}

	try {
		// Fetch all data in parallel
		const [eventResponse, documentsResponse, availableSpotsResponse] = await Promise.all([
			fetch(`${djangoApiUrl}/events/${id}/`, { headers }),
			fetch(`${djangoApiUrl}/documents/?event_id=${id}`, { headers }),
			fetch(`${nestApiUrl}/registration/${id}/available-spots`, { headers }),
		])

		if (!eventResponse.ok) {
			if (eventResponse.status === 404) {
				return NextResponse.json({ error: "Event not found" }, { status: 404 })
			}
			return NextResponse.json(
				{ error: `Failed to fetch event: ${eventResponse.status}` },
				{ status: eventResponse.status },
			)
		}

		const event = (await eventResponse.json()) as ClubEvent

		// Documents count - default to 0 if fetch fails
		let documentsCount = 0
		if (documentsResponse.ok) {
			const documents = (await documentsResponse.json()) as DocumentsResponse[]
			documentsCount = documents.length
		}

		// Available spots - default to 0 if fetch fails
		let availableSpots = 0
		let totalSpots = 0
		if (availableSpotsResponse.ok) {
			const spots = (await availableSpotsResponse.json()) as AvailableSpotsResponse
			availableSpots = spots.availableSpots
			totalSpots = spots.totalSpots
		}

		const statusInfo: EventStatusInfo = {
			event,
			documentsCount,
			availableSpots,
			totalSpots,
		}

		return NextResponse.json(statusInfo)
	} catch (error) {
		console.error("Error fetching event status:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
