import { NextRequest, NextResponse } from "next/server"

import { fetchFormDataWithAuth, fetchWithAuth } from "@/lib/api-proxy"
import { revalidatePublicNextCache } from "@/lib/revalidate"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
	}

	const formData = await request.formData()
	const response = await fetchFormDataWithAuth({
		request,
		backendPath: `/documents/${id}/`,
		method: "PUT",
		formData,
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
	if (response.ok) {
		void revalidatePublicNextCache("documents")
	}
	return response
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params

	if (!id) {
		return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
	}

	const response = await fetchWithAuth({
		request,
		backendPath: `/documents/${id}/`,
		method: "DELETE",
		apiBaseUrl: process.env.DJANGO_API_URL,
	})
	if (response.ok) {
		void revalidatePublicNextCache("documents")
	}
	return response
}
