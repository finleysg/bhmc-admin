// Resolve the current month per request, rather than caching the build-time date.
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { format } from "date-fns"

export default function CalendarRedirect() {
	const now = new Date()
	const year = now.getFullYear()
	const month = format(now, "MMMM").toLowerCase()
	redirect(`/calendar/${year}/${month}`)
}
