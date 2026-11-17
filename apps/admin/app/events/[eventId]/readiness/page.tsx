import Link from "next/link"
import { notFound } from "next/navigation"

import type { EventReadiness, ReadinessFinding, ReadinessTab } from "@repo/domain/types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { apiGet } from "@/lib/server-api"

import { countFindings, ReadinessDot, readinessLabel } from "../../components/readiness-indicator"

import { WarningButton } from "./components/warning-button"

const TAB_LABELS: Record<ReadinessTab, string> = {
	event: "Event",
	registration: "Registration",
	dates: "Dates",
	courses: "Courses",
	slots: "Slots",
	fees: "Fees",
	sessions: "Sessions",
}

/** Ready to Open Registration: what is wrong, why it matters, and how to fix it. */
export default async function ReadinessPage({ params }: { params: Promise<{ eventId: string }> }) {
	const eventId = Number((await params).eventId)
	if (!Number.isInteger(eventId)) notFound()

	const readiness = await apiGet<EventReadiness>(`/events/${eventId}/readiness`)
	const blocking = readiness.findings.filter((f) => f.severity === "blocking")
	const warnings = readiness.findings.filter((f) => f.severity === "warning" && !f.dismissed)
	const dismissed = readiness.findings.filter((f) => f.dismissed)
	const counts = countFindings(readiness)

	return (
		<div className="mx-auto max-w-3xl space-y-4 md:py-8">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						{readiness.applies && <ReadinessDot counts={counts} />}
						Ready to Open Registration
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{!readiness.applies ? (
						<p className="text-muted-foreground">
							Registration has opened, or the event has no registration, so these checks no longer
							apply.
						</p>
					) : readiness.findings.length === 0 ? (
						<p>Nothing to fix. The event is ready to open registration.</p>
					) : (
						<>
							<p className="text-muted-foreground">{readinessLabel(counts)}.</p>
							<FindingList title="Blocking" eventId={eventId} findings={blocking} />
							<FindingList title="Warnings" eventId={eventId} findings={warnings} />
							<FindingList title="Dismissed" eventId={eventId} findings={dismissed} />
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function FindingList({
	title,
	eventId,
	findings,
}: {
	title: string
	eventId: number
	findings: ReadinessFinding[]
}) {
	if (findings.length === 0) return null
	return (
		<section className="space-y-3">
			<h3 className="font-heading text-lg font-semibold">{title}</h3>
			<ul className="space-y-3">
				{findings.map((f) => (
					<li
						key={`${f.code}:${f.subject}`}
						className="flex items-start justify-between gap-4 rounded-md border p-3"
					>
						<div className="space-y-1">
							<p className={f.dismissed ? "font-medium text-muted-foreground" : "font-medium"}>
								{f.what}
							</p>
							<p className="text-sm text-muted-foreground">{f.why}</p>
							<p className="text-sm">
								{f.fix}{" "}
								{f.tab && (
									<Link
										href={`/events/${eventId}/setup?tab=${f.tab}`}
										className="text-primary underline-offset-4 hover:underline"
									>
										Go to {TAB_LABELS[f.tab]}
									</Link>
								)}
							</p>
						</div>
						{f.severity === "warning" && (
							<WarningButton
								eventId={eventId}
								code={f.code}
								subject={f.subject}
								dismissed={f.dismissed}
							/>
						)}
					</li>
				))}
			</ul>
		</section>
	)
}
