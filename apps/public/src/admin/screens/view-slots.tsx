import { useState } from "react"

import { ConfirmDialog } from "../../components/dialog/confirm"
import { ReservedGrid } from "../../components/reserve/reserved-grid"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useCreateEventSlots } from "../../hooks/use-create-event-slots"
import { useEventAdmin } from "../layout/event-admin"
import { EventRegistrationProvider } from "../../context/registration-context-provider"

export function ViewSlotsScreen() {
	const { clubEvent } = useEventAdmin()
	const [showConfirm, setShowConfirm] = useState(false)
	const [refreshKey, setRefreshKey] = useState(0)
	const { mutateAsync: createSlots, status } = useCreateEventSlots()

	const handleConfirm = async (decision: boolean) => {
		if (decision) {
			await createSlots({ eventId: clubEvent.id })
			setRefreshKey(refreshKey + 1)
		}
	}

	return (
		<div>
			<p>
				If the teesheet(s) below are incorrect, adjust the event settings and return here to
				rebuild.
			</p>
			<button className="btn btn-danger btn-sm mb-4" onClick={() => setShowConfirm(true)}>
				Rebuild Tee Sheet(s)
			</button>
			<ConfirmDialog
				show={showConfirm}
				message="This action will delete all existing sign-up slots and recreate them using the current event settings. Continue?"
				onClose={handleConfirm}
			/>
			<EventRegistrationProvider clubEvent={clubEvent}>
				<ReservedGrid key={refreshKey} clubEvent={clubEvent} />
			</EventRegistrationProvider>
			<OverlaySpinner loading={status === "pending"} />
		</div>
	)
}
