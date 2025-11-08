import jwt from "jsonwebtoken"
import { NextRequest } from "next/server"

import auth from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	try {
		// Verify session
		const session = await auth.api.getSession({
			headers: request.headers,
		})

		if (!session) {
			return new Response("Unauthorized", { status: 401 })
		}

		// Get JWT token from Better Auth's /api/auth/token endpoint
		const tokenResponse = await fetch(`${request.nextUrl.origin}/api/auth/token`, {
			headers: {
				cookie: request.headers.get("cookie") || "",
			},
		})

		if (!tokenResponse.ok) {
			return new Response("Failed to generate JWT token", { status: 500 })
		}

		const tokenResponseData = (await tokenResponse.json()) as { token: string }
		const { token: eddsaToken } = tokenResponseData

		// Decode the EdDSA token and re-sign with HS256 for backend compatibility
		const decoded = jwt.decode(eddsaToken, { complete: true }) as jwt.JwtPayload | null
		if (!decoded || !decoded.payload) {
			return new Response("Failed to decode JWT token", { status: 500 })
		}

		// Re-sign with HS256 using the shared secret
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		const token = jwt.sign(decoded.payload, process.env.BETTER_AUTH_JWT_SECRET || "")

		// Connect to backend SSE endpoint
		const apiUrl = process.env.API_URL
		if (!apiUrl) {
			return new Response("API URL not configured", { status: 500 })
		}

		const backendUrl = `${apiUrl}/golfgenius/events/${id}/import-skins-stream`

		const response = await fetch(backendUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "text/event-stream",
			},
		})

		if (!response.ok) {
			return new Response(`Backend error: ${response.status}`, { status: response.status })
		}

		// Stream the response back to client
		return new Response(response.body, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		})
	} catch (error) {
		console.error("Error proxying SSE:", error)
		return new Response("Internal server error", { status: 500 })
	}
}
