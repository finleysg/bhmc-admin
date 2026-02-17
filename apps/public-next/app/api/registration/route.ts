import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"
import { snakeToCamelKeys } from "@/lib/snake-to-camel"

const CORRELATION_HEADERS = ["X-Correlation-ID"]

/**
 * Django FK fields that need an `Id` suffix after camelCase conversion.
 * Django serializes `event_fee` (the FK) as an integer PK, but the front-end
 * types expect `eventFeeId`.
 */
const DJANGO_FK_FIELDS = new Set([
	"event",
	"event_fee",
	"registration_slot",
	"registration",
	"course",
	"hole",
	"payment",
])

export async function GET(request: NextRequest) {
	const response = await fetchWithAuth({
		request,
		backendPath: "/registration/",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
	if (!response.ok) return response
	const data: unknown = await response.json()
	return NextResponse.json(snakeToCamelKeys(data, DJANGO_FK_FIELDS))
}

export async function POST(request: NextRequest) {
	const body: unknown = await request.json()
	return fetchWithAuth({
		request,
		backendPath: "/registration",
		method: "POST",
		body,
		forwardHeaders: CORRELATION_HEADERS,
	})
}
