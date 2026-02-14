import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://backend:8000/api"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const season = searchParams.get("season")
	const category = searchParams.get("category")
	const top = searchParams.get("top")

	const params = new URLSearchParams()
	if (season) params.set("season", season)
	if (category) params.set("category", category)
	if (top) params.set("top", top)

	const url = `${DJANGO_API_URL}/season-long-points/top_points/?${params.toString()}`

	const response = await fetch(url)

	if (!response.ok) {
		return NextResponse.json({ error: "Failed to fetch points" }, { status: response.status })
	}

	const data: unknown = await response.json()
	return NextResponse.json(data)
}
