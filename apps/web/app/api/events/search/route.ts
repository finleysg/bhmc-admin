import { NextRequest, NextResponse } from "next/server"

import auth from "../../../../lib/auth"

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const date = searchParams.get("date")

	if (!date) {
		return NextResponse.json({ error: "Date parameter is required" }, { status: 400 })
	}

	try {
		// Verify session first
		const session = await auth.api.getSession({
			headers: request.headers,
		})

		if (!session) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		// Get JWT token from Better Auth's /api/auth/token endpoint
		const tokenResponse = await fetch(`${request.nextUrl.origin}/api/auth/token`, {
			headers: {
				cookie: request.headers.get("cookie") || "",
			},
		})

		if (!tokenResponse.ok) {
			return NextResponse.json({ error: "Failed to generate JWT token" }, { status: 500 })
		}

		const { token: eddsaToken } = await tokenResponse.json()
		console.log("Generated EdDSA JWT token:", eddsaToken)

		// Decode the EdDSA token and re-sign with HS256 for backend compatibility
		const jwt = require("jsonwebtoken")
		const decoded = jwt.decode(eddsaToken, { complete: true })
		if (!decoded || !decoded.payload) {
			return NextResponse.json({ error: "Failed to decode JWT token" }, { status: 500 })
		}

		// Re-sign with HS256 using the shared secret
		const token = jwt.sign(decoded.payload, process.env.BETTER_AUTH_JWT_SECRET || "")
		console.log("Re-signed HS256 token:", token)

		// Forward the request to the backend API with the JWT token
		const apiUrl = process.env.API_URL
		if (!apiUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		const backendUrl = `${apiUrl}/events/search?date=${encodeURIComponent(date)}`

		const response = await fetch(backendUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			return NextResponse.json(
				{ error: `Backend API error: ${errorText}` },
				{ status: response.status },
			)
		}

		const data = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Error proxying to backend API:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
