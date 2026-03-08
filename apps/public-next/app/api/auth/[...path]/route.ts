import { NextRequest, NextResponse } from "next/server"

const DJANGO_URL = process.env.DJANGO_API_URL || "http://backend:8000/api"

async function proxyToDjango(request: NextRequest): Promise<NextResponse> {
	const url = new URL(request.url)
	const segments = url.pathname.replace("/api/auth/", "")

	let djangoPath: string
	switch (segments) {
		case "login":
			djangoPath = "/auth/token/login/"
			break
		case "logout":
			djangoPath = "/auth/token/logout/"
			break
		case "me":
			djangoPath = "/auth/users/me/"
			break
		default:
			return NextResponse.json({ error: "Not found" }, { status: 404 })
	}

	const djangoBaseUrl = DJANGO_URL.replace(/\/api$/, "")
	const backendUrl = `${djangoBaseUrl}${djangoPath}`

	const headers: HeadersInit = {}
	const cookie = request.cookies.get("access_token")
	if (cookie) {
		headers["Authorization"] = `Token ${cookie.value}`
	}

	const contentType = request.headers.get("content-type")
	if (contentType) {
		headers["Content-Type"] = contentType
	}

	let body: string | undefined
	if (request.method === "POST") {
		body = await request.text()
	}

	const response = await fetch(backendUrl, {
		method: request.method,
		headers,
		...(body ? { body } : {}),
	})

	if (response.status === 204) {
		const res = new NextResponse(null, { status: 204 })
		// Forward set-cookie headers from Django (token clear on logout)
		const setCookie = response.headers.getSetCookie()
		for (const c of setCookie) {
			res.headers.append("Set-Cookie", c)
		}
		return res
	}

	const data = await response.text()
	const res = new NextResponse(data, {
		status: response.status,
		headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
	})

	// Forward set-cookie headers from Django (token on login)
	const setCookie = response.headers.getSetCookie()
	for (const c of setCookie) {
		res.headers.append("Set-Cookie", c)
	}

	return res
}

export async function GET(request: NextRequest) {
	return proxyToDjango(request)
}

export async function POST(request: NextRequest) {
	return proxyToDjango(request)
}
