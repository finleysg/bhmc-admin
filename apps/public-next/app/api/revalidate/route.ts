import { revalidateTag } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
	const { tag } = (await request.json()) as { tag: unknown }
	if (!tag || typeof tag !== "string") {
		return NextResponse.json({ error: "tag is required" }, { status: 400 })
	}
	revalidateTag(tag, "max")
	return NextResponse.json({ revalidated: true, tag })
}
