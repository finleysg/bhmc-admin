import { EventReport } from "../../components/reports/event-report"
import { useEventAdmin } from "../layout/event-admin"

export function EventReportScreen() {
	const { clubEvent } = useEventAdmin()

	return <EventReport clubEvent={clubEvent} />
}
