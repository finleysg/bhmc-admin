const PUBLIC_NEXT_URL = "http://localhost:3200"

/**
 * Invalidate the Next.js event cache then poll until the event name appears
 * in the event page HTML. Throws if the event is not visible after all attempts.
 */
export async function warmCacheAndVerify(
	eventUrl: string,
	eventName: string,
	maxAttempts = 8,
	delayMs = 1500,
): Promise<void> {
	await fetch(`${PUBLIC_NEXT_URL}/api/revalidate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tag: "events" }),
	})

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const res = await fetch(`${PUBLIC_NEXT_URL}${eventUrl}`)
		const html = await res.text()
		if (html.includes(eventName)) return
		await new Promise((resolve) => setTimeout(resolve, delayMs))
	}

	throw new Error(
		`Cache warm failed: event "${eventName}" not found at ${eventUrl} after ${maxAttempts} attempts (${(maxAttempts * delayMs) / 1000}s)`,
	)
}
