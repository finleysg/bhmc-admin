import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
	try {
		const token = request.cookies.get("access_token")?.value
		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}

		const apiUrl = process.env.DJANGO_API_URL
		if (!apiUrl) {
			return NextResponse.json({ error: "API URL not configured" }, { status: 500 })
		}

		const formData = await request.formData()

		const response = await fetch(`${apiUrl}/photos/`, {
			method: "POST",
			headers: {
				Authorization: `Token ${token}`,
			},
			body: formData,
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

		const data: unknown = await response.json()
		return NextResponse.json(data)
	} catch (error) {
		console.error("Error uploading photo:", error)
		return NextResponse.json({ error: "Internal server error" }, { status: 500 })
	}
}
