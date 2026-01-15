import { format } from "date-fns"

import { useEventRegistrations } from "../../hooks/use-event-registrations"
import { slugify } from "../../models/club-event"
import { ClubEventProps } from "../../models/common-props"
import { RenderReportData } from "./render-report-data"

export function RegistrationNotes({ clubEvent }: ClubEventProps) {
	const { data: registrations } = useEventRegistrations(clubEvent.id)

	const reportName = `${slugify(clubEvent.name)}-registration-notes.csv`
	const reportHeader = ["Signed Up By", "Signup Date", "Notes"]
	const reportData =
		registrations
			?.filter((r) => r.notes)
			.map((reg) => [reg.signedUpBy, format(reg.createdDate, "yyyy-MM-dd hh:mm a"), reg.notes]) ??
		[]

	return (
		<RenderReportData
			title="Registration Notes"
			reportData={reportData}
			reportHeader={reportHeader}
			reportName={reportName}
		/>
	)
}
