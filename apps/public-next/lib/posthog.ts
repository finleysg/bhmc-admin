import posthog from "posthog-js"

export function initPostHogErrorTracking() {
	if (typeof window === "undefined") return
	if (posthog.__loaded) return

	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
	if (!key) return

	posthog.init(key, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		autocapture: false,
		capture_pageview: false,
		capture_pageleave: false,
		disable_session_recording: true,
		enable_heatmaps: false,
		persistence: "memory",
	})
	posthog.register({ app: "public-next" })
}

export { posthog }
