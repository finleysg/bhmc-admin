import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://backend:8000/api"

export async function GET(request: NextRequest) {
	const token = request.cookies.get("access_token")?.value
	if (!token) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const pattern = searchParams.get("pattern") || ""

	const url = `${DJANGO_API_URL}/players/search/?pattern=${encodeURIComponent(pattern)}`

	const response = await fetch(url, {
		headers: { Authorization: `Token ${token}` },
	})

	if (!response.ok) {
		return NextResponse.json({ error: "Failed to search players" }, { status: response.status })
	}

	const data: unknown = await response.json()
	return NextResponse.json(data)
}
