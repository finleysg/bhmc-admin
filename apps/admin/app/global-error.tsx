"use client"

import { useEffect } from "react"
import { initPostHogErrorTracking, posthog } from "../lib/posthog"

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		initPostHogErrorTracking()
		posthog.captureException(error)
	}, [error])

	return (
		<html>
			<body>
				<div className="flex min-h-screen items-center justify-center">
					<div className="text-center">
						<h2 className="text-2xl font-bold">Something went wrong</h2>
						<button className="btn btn-primary mt-4" onClick={() => reset()}>
							Try again
						</button>
					</div>
				</div>
			</body>
		</html>
	)
}
