"use client"

import { useState } from "react"

import { useParams } from "next/navigation"

import { useAuth } from "@/lib/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardBody, CardTitle } from "@/components/ui/card"
import { PageLayout } from "@/components/ui/page-layout"

interface CopyResult {
	date: string
	success: boolean
	message: string
}

export default function CopyEventPage() {
	const { isAuthenticated: signedIn, isLoading: isPending } = useAuth()
	const params = useParams()
	const eventId = params.eventId as string

	const [dates, setDates] = useState<string[]>([""])
	const [isCopying, setIsCopying] = useState(false)
	const [results, setResults] = useState<CopyResult[]>([])

	const addDate = () => {
		setDates((prev) => [...prev, ""])
	}

	const removeDate = (index: number) => {
		setDates((prev) => prev.filter((_, i) => i !== index))
	}

	const updateDate = (index: number, value: string) => {
		setDates((prev) => prev.map((d, i) => (i === index ? value : d)))
	}

	const handleCopy = async () => {
		const validDates = dates.filter((d) => d.trim() !== "")
		if (validDates.length === 0) return

		setIsCopying(true)
		setResults([])

		const copyResults: CopyResult[] = []

		for (const date of validDates) {
			try {
				const response = await fetch(`/api/events/${eventId}/copy?start_dt=${date}`, {
					method: "POST",
				})
				if (!response.ok) {
					const errorData = (await response.json().catch(() => null)) as {
						error?: string
					} | null
					throw new Error(errorData?.error || `Failed with status ${response.status}`)
				}
				copyResults.push({ date, success: true, message: "Event copied successfully" })
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error"
				copyResults.push({ date, success: false, message })
			}
		}

		setResults(copyResults)
		setIsCopying(false)
	}

	if (isPending) {
		return <LoadingSpinner size="lg" />
	}

	if (!signedIn) {
		return null
	}

	const hasValidDates = dates.some((d) => d.trim() !== "")

	return (
		<PageLayout>
			<div className="max-w-3xl mx-auto space-y-4">
				<Card>
					<CardBody>
						<CardTitle>Copy Event</CardTitle>
						<p className="text-base-content/70 text-sm mb-4">
							Add one or more dates to copy this event to. Each date will create a new event with
							the same configuration.
						</p>
						<div className="space-y-3">
							{dates.map((date, index) => (
								<div key={index} className="flex items-center gap-2">
									<input
										type="date"
										className="input input-bordered flex-1"
										value={date}
										onChange={(e) => updateDate(index, e.target.value)}
										disabled={isCopying}
									/>
									{dates.length > 1 && (
										<button
											type="button"
											className="btn btn-ghost btn-sm"
											onClick={() => removeDate(index)}
											disabled={isCopying}
											aria-label="Remove date"
										>
											✕
										</button>
									)}
								</div>
							))}
						</div>
						<div className="flex justify-between mt-4">
							<button
								type="button"
								className="btn btn-ghost btn-sm"
								onClick={addDate}
								disabled={isCopying}
							>
								+ Add Date
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => void handleCopy()}
								disabled={isCopying || !hasValidDates}
							>
								{isCopying ? (
									<>
										<span className="loading loading-spinner loading-sm"></span>
										Copying...
									</>
								) : (
									"Copy Event"
								)}
							</button>
						</div>
					</CardBody>
				</Card>

				{results.length > 0 && (
					<Card>
						<CardBody>
							<CardTitle>Results</CardTitle>
							<div className="space-y-2">
								{results.map((result, index) => (
									<div key={index} className="flex justify-between items-center">
										<span className="font-medium">{result.date}</span>
										<span className={`text-sm ${result.success ? "text-success" : "text-error"}`}>
											{result.message}
										</span>
									</div>
								))}
							</div>
						</CardBody>
					</Card>
				)}
			</div>
		</PageLayout>
	)
}
