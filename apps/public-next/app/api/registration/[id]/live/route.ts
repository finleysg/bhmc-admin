import { NextRequest } from "next/server"

function getAuthToken(request: NextRequest): string | null {
	const cookie = request.cookies.get("access_token")
	return cookie?.value || null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const token = getAuthToken(request)

	if (!token) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		})
	}

	const apiUrl = process.env.API_URL
	if (!apiUrl) {
		return new Response(JSON.stringify({ error: "API URL not configured" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		})
	}

	const backendUrl = `${apiUrl}/registration/${id}/live`
	const abortController = new AbortController()

	const backendResponse = await fetch(backendUrl, {
		headers: {
			Authorization: `Token ${token}`,
			Accept: "text/event-stream",
		},
		signal: abortController.signal,
	})

	if (!backendResponse.ok) {
		return new Response(JSON.stringify({ error: "SSE connection failed" }), {
			status: backendResponse.status,
			headers: { "Content-Type": "application/json" },
		})
	}

	if (!backendResponse.body) {
		return new Response(JSON.stringify({ error: "No stream body" }), {
			status: 502,
			headers: { "Content-Type": "application/json" },
		})
	}

	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined

	const stream = new ReadableStream({
		async start(controller) {
			reader = backendResponse.body!.getReader()
			const encoder = new TextEncoder()

			try {
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					controller.enqueue(value ?? encoder.encode(""))
				}
			} catch {
				// Stream closed by client or backend
			} finally {
				controller.close()
				reader.releaseLock()
			}
		},
		cancel() {
			abortController.abort()
			void reader?.cancel()
		},
	})

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	})
}

export const dynamic = "force-dynamic"
