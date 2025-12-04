import { NextRequest, NextResponse } from "next/server"
import { fetchWithAuth } from "@/lib/api-proxy"
import type { RefundRequest } from "@repo/domain/types"

export async function POST(request: NextRequest) {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
	}

	if (!Array.isArray(body)) {
		return NextResponse.json({ error: "Body must be an array of refund requests" }, { status: 400 })
	}

	const isValid = body.every((item: unknown) => {
		if (typeof item !== "object" || item === null) return false
		const req = item as Record<string, unknown>
		return (
			typeof req.paymentId === "number" &&
			Array.isArray(req.registrationFeeIds) &&
			(req.registrationFeeIds as unknown[]).every((id) => typeof id === "number")
		)
	})

	if (!isValid) {
		return NextResponse.json({ error: "Invalid refund request format" }, { status: 400 })
	}

	const refundRequests = body as RefundRequest[]
	const backendPath = `/registration/refund`
	return fetchWithAuth({ request, backendPath, method: "POST", body: refundRequests })
}
