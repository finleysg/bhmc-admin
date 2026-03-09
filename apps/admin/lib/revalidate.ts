const PUBLIC_NEXT_URL = process.env.PUBLIC_NEXT_URL

export async function revalidatePublicNextCache(tag: string): Promise<void> {
	if (!PUBLIC_NEXT_URL) {
		console.warn("PUBLIC_NEXT_URL not configured, skipping revalidation")
		return
	}

	try {
		await fetch(`${PUBLIC_NEXT_URL}/api/revalidate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tag }),
		})
	} catch (error) {
		console.error("Failed to revalidate public-next cache:", error)
	}
}
