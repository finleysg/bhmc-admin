import { NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"

interface PlayerResult {
	id: number
	firstName: string
	lastName: string
	email: string
	birthDate?: string | null
	isMember: boolean
	lastSeason?: number | null
}

export async function GET(request: NextRequest) {
	const pattern = request.nextUrl.searchParams.get("pattern")
	if (!pattern || pattern.length < 3) {
		return NextResponse.json([])
	}

	const response = await fetchWithAuth({
		request,
		backendPath: `/registration/players/search`,
	})

	if (!response.ok) {
		return response
	}

	const players = (await response.json()) as PlayerResult[]

	const transformed = players.map((p) => ({
		id: p.id,
		first_name: p.firstName,
		last_name: p.lastName,
		email: p.email,
		birth_date: p.birthDate ?? null,
		is_member: p.isMember,
		last_season: p.lastSeason ?? null,
	}))

	return NextResponse.json(transformed)
}
