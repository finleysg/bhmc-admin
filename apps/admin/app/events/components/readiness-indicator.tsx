import Link from "next/link"

import type { EventReadiness, ReadinessLevel, ReadinessSummary } from "@repo/domain/types"

import { cn } from "@/lib/utils"

const DOT: Record<ReadinessLevel, string> = {
	red: "bg-destructive",
	yellow: "bg-amber-500",
	green: "bg-emerald-600",
}

type Counts = Pick<ReadinessSummary, "level" | "blocking" | "warnings">

/** Counts an event's findings: blocking ones, and warnings not dismissed. */
export function countFindings(r: EventReadiness): Counts {
	return {
		level: r.level,
		blocking: r.findings.filter((f) => f.severity === "blocking").length,
		warnings: r.findings.filter((f) => f.severity === "warning" && !f.dismissed).length,
	}
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

/** "Not ready to open registration: 2 blocking, 1 warning" and the like. */
export function readinessLabel({ level, blocking, warnings }: Counts): string {
	const parts = [
		blocking ? `${blocking} blocking` : "",
		warnings ? plural(warnings, "warning") : "",
	]
	const counts = parts.filter(Boolean).join(", ")
	const head = level === "red" ? "Not ready to open registration" : "Ready to open registration"
	return counts ? `${head}: ${counts}` : head
}

export function ReadinessDot({ counts, className }: { counts: Counts; className?: string }) {
	return (
		<span
			role="img"
			aria-label={readinessLabel(counts)}
			title={readinessLabel(counts)}
			className={cn("inline-block size-2.5 shrink-0 rounded-full", DOT[counts.level], className)}
		/>
	)
}

/** The event's Ready to Open Registration level, linking to its findings. */
export function ReadinessIndicator({ eventId, counts }: { eventId: number; counts: Counts }) {
	return (
		<Link
			href={`/events/${eventId}/readiness`}
			className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-muted"
		>
			<span aria-hidden="true" className={cn("size-2.5 rounded-full", DOT[counts.level])} />
			{readinessLabel(counts)}
		</Link>
	)
}
