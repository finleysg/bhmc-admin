import { NextRequest, NextResponse } from "next/server"

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://backend:8000/api"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const params = new URLSearchParams()

	const page = searchParams.get("page")
	const tags = searchParams.get("tags")

	if (page) params.set("page", page)
	if (tags) params.set("tags", tags)

	const url = `${DJANGO_API_URL}/photos/?${params.toString()}`

	const response = await fetch(url)

	if (!response.ok) {
		return NextResponse.json({ error: "Failed to fetch photos" }, { status: response.status })
	}

	const data: unknown = await response.json()
	return NextResponse.json(data)
}
