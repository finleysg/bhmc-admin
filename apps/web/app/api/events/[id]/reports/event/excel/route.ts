import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"

import auth from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Event ID is required" }, { status: 400 })
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

		const tokenResponseData = await tokenResponse.json()
		const { token: eddsaToken } = tokenResponseData

		// Decode the EdDSA token and re-sign with HS256 for backend compatibility
		const decoded = jwt.decode(eddsaToken, { complete: true })
		if (!decoded || !decoded.payload) {
			return NextResponse.json({ error: "Failed to decode JWT token" }, { status: 500 })
		}

		// Re-sign with HS256 using the shared secret
		const token = jwt.sign(decoded.payload, process.env.BETTER_AUTH_JWT_SECRET || "")

		// Forward the request to the backend API with the JWT token
		const apiUrl = process.env.API_URL
		if (!apiUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		const backendUrl = `${apiUrl}/reports/events/${id}/event-report/excel`

		const response = await fetch(backendUrl, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			return NextResponse.json(
				{ error: `Backend API error: ${errorText}` },
				{ status: response.status },
			)
		}

		// For binary responses (Excel files), forward the response directly
		const buffer = await response.arrayBuffer()

		return new NextResponse(buffer, {
			headers: {
				"Content-Type":
					response.headers.get("Content-Type") ||
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition":
					response.headers.get("Content-Disposition") ||
					`attachment; filename="event-report-${id}.xlsx"`,
			},
		})
	} catch (error) {
		console.error("Error proxying Excel download:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
