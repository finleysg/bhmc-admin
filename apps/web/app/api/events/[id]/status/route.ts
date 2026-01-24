import { NextRequest, NextResponse } from "next/server"

import { validateEventStatus, parseEventStartDateTime } from "@repo/domain/functions"
import type { ClubEvent, EventStatusInfo } from "@repo/domain/types"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
	}

	try {
		// Fetch event from NestJS
		const eventResponse = await fetch(`${process.env.API_URL}/events/${id}`, {
			headers: {
				Authorization: request.headers.get("Authorization") || "",
			},
		})

		if (!eventResponse.ok) {
			return NextResponse.json({ error: "Event not found" }, { status: eventResponse.status })
		}

		const event = (await eventResponse.json()) as ClubEvent

		// Fetch available slot count
		const slotCountResponse = await fetch(
			`${process.env.API_URL}/events/${id}/available-slot-count`,
			{
				headers: {
					Authorization: request.headers.get("Authorization") || "",
				},
			},
		)

		const slotCountData = slotCountResponse.ok
			? ((await slotCountResponse.json()) as { count: number })
			: { count: 0 }
		const availableSlotCount = slotCountData.count

		// Fetch tee time documents from Django
		const docsResponse = await fetch(
			`${process.env.DJANGO_API_URL}/documents/?event_id=${id}&type=T`,
			{
				headers: {
					Authorization: request.headers.get("Authorization") || "",
				},
			},
		)

		const docs = docsResponse.ok ? ((await docsResponse.json()) as unknown[]) : []
		const hasTeeTimeDocument = Array.isArray(docs) && docs.length > 0

		// Compute isReadonly
		const now = new Date()
		const eventStart = parseEventStartDateTime(event)
		const isReadonly = eventStart <= now

		// Run validation
		const validations = validateEventStatus(event, availableSlotCount, hasTeeTimeDocument)

		// Build response
		const statusInfo: EventStatusInfo = {
			event,
			availableSlotCount,
			hasTeeTimeDocument,
			isReadonly,
			validations,
		}

		return NextResponse.json(statusInfo)
	} catch (error) {
		console.error("Error fetching event status:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
