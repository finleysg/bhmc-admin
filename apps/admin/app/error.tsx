"use client"

import { useEffect } from "react"
import { posthog } from "../lib/posthog"

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		posthog.captureException(error)
	}, [error])

	return (
		<div className="flex min-h-[50vh] items-center justify-center">
			<div className="text-center">
				<h2 className="text-2xl font-bold">Something went wrong</h2>
				<button className="btn btn-primary mt-4" onClick={() => reset()}>
					Try again
				</button>
			</div>
		</div>
	)
}
