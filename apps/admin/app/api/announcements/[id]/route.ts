import { type NextRequest, NextResponse } from "next/server"

import { fetchWithAuth } from "@/lib/api-proxy"
import { revalidatePublicNextCache } from "@/lib/revalidate"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	if (!id) {
		return NextResponse.json({ error: "id is required" }, { status: 400 })
	}
	return fetchWithAuth({ request, backendPath: `/announcements/${id}` })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	if (!id) {
		return NextResponse.json({ error: "id is required" }, { status: 400 })
	}
	const body: unknown = await request.json()
	const response = await fetchWithAuth({
		request,
		backendPath: `/announcements/${id}`,
		method: "PUT",
		body,
	})

	if (response.ok) {
		void revalidatePublicNextCache("announcements")
	}

	return response
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params
	if (!id) {
		return NextResponse.json({ error: "id is required" }, { status: 400 })
	}
	const response = await fetchWithAuth({
		request,
		backendPath: `/announcements/${id}`,
		method: "DELETE",
	})

	if (response.ok || response.status === 204) {
		void revalidatePublicNextCache("announcements")
	}

	return response
}
