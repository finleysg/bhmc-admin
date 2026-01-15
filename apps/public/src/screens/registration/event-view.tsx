import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { EventDocuments } from "../../components/document/event-documents"
import { EventDetail } from "../../components/events/event-detail"
import { EventPhotos } from "../../components/events/event-photos"
import { FeesAndPoints } from "../../components/events/fees-and-points"
import { RegisterStep, ReserveStep } from "../../context/registration-reducer"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { useCurrentEvent } from "./event-detail"

export function EventViewScreen() {
	const { clubEvent } = useCurrentEvent()
	const { createRegistration, initiateStripeSession, updateStep } = useEventRegistration()
	const navigate = useNavigate()

	const handleStart = async () => {
		try {
			initiateStripeSession()
			if (clubEvent.canChoose) {
				updateStep(ReserveStep)
				navigate("reserve")
			} else {
				await createRegistration(undefined, [], undefined)
				updateStep(RegisterStep)
				navigate("register")
			}
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to start registration")
		}
	}

	const handleEdit = () => {
		navigate("manage")
	}

	return (
		<div className="row">
			<div className="col-md-8">
				<EventDetail
					clubEvent={clubEvent}
					onRegister={handleStart}
					onEditRegistration={handleEdit}
				/>
			</div>
			<div className="col-md-4">
				<FeesAndPoints clubEvent={clubEvent} />
				<EventDocuments clubEvent={clubEvent} />
				<EventPhotos clubEvent={clubEvent} />
			</div>
		</div>
	)
}
