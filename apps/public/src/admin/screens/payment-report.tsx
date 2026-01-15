import { PaymentReport } from "../../components/reports/payment-report"
import { useEventAdmin } from "../layout/event-admin"

export function PaymentReportScreen() {
	const { clubEvent } = useEventAdmin()

	return <PaymentReport clubEvent={clubEvent} />
}
