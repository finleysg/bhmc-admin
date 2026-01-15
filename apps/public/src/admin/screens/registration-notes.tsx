import { RegistrationNotes } from "../../components/reports/registration-notes"
import { useEventAdmin } from "../layout/event-admin"

export function RegistrationNotesScreen() {
	const { clubEvent } = useEventAdmin()

	return <RegistrationNotes clubEvent={clubEvent} />
}
