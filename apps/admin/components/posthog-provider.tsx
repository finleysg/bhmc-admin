"use client"

import { useEffect } from "react"
import { initPostHogErrorTracking } from "../lib/posthog"

export function PostHogErrorProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		initPostHogErrorTracking()
	}, [])

	return <>{children}</>
}
