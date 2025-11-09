import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"

import auth from "./auth"

interface TokenResponse {
	token: string
}

interface DecodedToken {
	payload: Record<string, unknown>
}

interface FetchWithAuthOptions {
	request: NextRequest
	backendPath: string // e.g., "/events/search?date=2024-01-01"
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
	body?: unknown
}

interface FetchSSEWithAuthOptions {
	request: NextRequest
	backendPath: string // e.g., "/golfgenius/events/123/import-points"
}

/**
 * Centralized utility for making authenticated requests to the backend API.
 * Handles session verification, JWT token generation, and request forwarding.
 */
export async function fetchWithAuth({
	request,
	backendPath,
	method = "GET",
	body,
}: FetchWithAuthOptions): Promise<NextResponse> {
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const tokenResponseData: TokenResponse = await tokenResponse.json()
		const { token: eddsaToken } = tokenResponseData

		// Decode the EdDSA token and re-sign with HS256 for backend compatibility
		const decoded = jwt.decode(eddsaToken, { complete: true }) as DecodedToken | null
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

		const backendUrl = `${apiUrl}${backendPath}`

		const response = await fetch(backendUrl, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			...(body && { body: JSON.stringify(body) }),
		})

		if (!response.ok) {
			const errorText = await response.text()
			return NextResponse.json(
				{ error: `Backend API error: ${errorText}` },
				{ status: response.status },
			)
		}

		const data: unknown = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Error proxying to backend API:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}

/**
 * Generates a backend-compatible JWT token from the current session.
 * Handles EdDSA to HS256 conversion for backend compatibility.
 */
async function getBackendAuthToken(request: NextRequest): Promise<string | Response> {
	try {
		// Verify session first
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

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const tokenResponseData: TokenResponse = await tokenResponse.json()
		const { token: eddsaToken } = tokenResponseData

		// Decode the EdDSA token and re-sign with HS256 for backend compatibility
		const decoded = jwt.decode(eddsaToken, { complete: true }) as DecodedToken | null
		if (!decoded || !decoded.payload) {
			return new Response("Failed to decode JWT token", { status: 500 })
		}

		// Re-sign with HS256 using the shared secret
		const token = jwt.sign(decoded.payload, process.env.BETTER_AUTH_JWT_SECRET || "")

		return token
	} catch (error) {
		console.error("Error generating backend auth token:", error)
		return new Response("Internal server error", { status: 500 })
	}
}

/**
 * Centralized utility for making authenticated SSE (Server-Sent Events) requests to the backend API.
 * Handles session verification, JWT token generation, and SSE streaming.
 */
export async function fetchSSEWithAuth({
	request,
	backendPath,
}: FetchSSEWithAuthOptions): Promise<Response> {
	try {
		// Generate backend-compatible JWT token
		const tokenResult = await getBackendAuthToken(request)
		if (tokenResult instanceof Response) {
			return tokenResult
		}

		// Connect to backend SSE endpoint
		const apiUrl = process.env.API_URL
		if (!apiUrl) {
			return new Response("API URL not configured", { status: 500 })
		}

		const backendUrl = `${apiUrl}${backendPath}`

		const response = await fetch(backendUrl, {
			headers: {
				Authorization: `Bearer ${tokenResult}`,
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
