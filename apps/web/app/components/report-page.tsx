import { ReactNode } from "react"

import Link from "next/link"

import { useAuthenticatedFetch, useExcelExport } from "@/lib/use-report"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface ReportPageProps<T> {
	title: string
	eventId: string
	fetchPath: string
	excelPath: string
	filenamePrefix: string
	children: (data: T | null) => ReactNode
}

export function ReportPage<T>({
	title,
	eventId,
	fetchPath,
	excelPath,
	filenamePrefix,
	children,
}: ReportPageProps<T>) {
	const { data, loading, error } = useAuthenticatedFetch<T>(fetchPath)
	const { download } = useExcelExport(excelPath, `${filenamePrefix}-${eventId}`)

	if (loading) {
		return (
			<div className="flex items-center justify-center p-2">
				<LoadingSpinner size="lg" />
			</div>
		)
	}

	if (error) {
		return (
			<main className="min-h-screen flex items-center justify-center p-2">
				<div className="w-full max-w-3xl text-center">
					<h2 className="text-3xl font-bold mb-4">{title}</h2>
					<p className="text-error mb-8">Error loading report: {error}</p>
					<Link href={`/events/${eventId}/reports`} className="btn btn-primary">
						Back to Reports
					</Link>
				</div>
			</main>
		)
	}

	const recordCount = data
		? Array.isArray(data)
			? data.length
			: (data as { sections?: unknown[] })?.sections?.length || 1
		: 0
	const hasData = recordCount > 0
	const isSingleObject =
		data && !Array.isArray(data) && !(data as { sections?: unknown[] })?.sections

	return (
		<main className="min-h-screen p-2">
			<div className="w-full">
				<div className="flex items-center justify-between mb-4">
					<h1 className="text-xl text-info font-bold">
						{title}
						{!isSingleObject && (
							<span>
								{" "}
								({recordCount} {recordCount === 1 ? "record" : "records"})
							</span>
						)}
					</h1>
					{hasData && (
						<button onClick={() => void download()} className="btn btn-neutral btn-sm">
							Export to Excel
						</button>
					)}
				</div>

				{hasData ? (
					children(data)
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground">No data available for this event.</p>
					</div>
				)}
			</div>
		</main>
	)
}
