import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://backend:8000/api"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ playerId: string }> },
) {
	const token = request.cookies.get("access_token")?.value
	if (!token) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { playerId } = await params
	const url = `${DJANGO_API_URL}/players/${playerId}/`

	const response = await fetch(url, {
		headers: { Authorization: `Token ${token}` },
	})

	if (!response.ok) {
		return NextResponse.json({ error: "Failed to fetch player" }, { status: response.status })
	}

	const data: unknown = await response.json()
	return NextResponse.json(data)
}
