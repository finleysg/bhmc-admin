import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
	try {
		const token = request.cookies.get("access_token")?.value
		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const djangoUrl = process.env.DJANGO_API_URL
		if (!djangoUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		const body: unknown = await request.json()

		// Djoser's set_password endpoint is under /auth, not /api
		const baseUrl = djangoUrl.replace(/\/api$/, "")
		const response = await fetch(`${baseUrl}/auth/users/set_password/`, {
			method: "POST",
			headers: {
				Authorization: `Token ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		})

		if (!response.ok) {
			const errorText = await response.text()
			let errorBody: unknown
			try {
				errorBody = JSON.parse(errorText)
			} catch {
				errorBody = { error: errorText }
			}
			return NextResponse.json(errorBody, { status: response.status })
		}

		return new NextResponse(null, { status: 204 })
	} catch (error) {
		console.error("Error changing password:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
