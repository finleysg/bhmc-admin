import { SkinsReport } from "../../components/reports/skins-report"
import { useEventAdmin } from "../layout/event-admin"

export function SkinsReportScreen() {
	const { clubEvent } = useEventAdmin()

	return <SkinsReport clubEvent={clubEvent} />
}
