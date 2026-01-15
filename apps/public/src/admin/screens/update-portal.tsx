import { EventPortalForm } from "../../components/events/event-portal-form"
import { ErrorDisplay } from "../../components/feedback/error-display"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useEventPatch } from "../../hooks/use-event-patch"
import { ClubEventData } from "../../models/club-event"
import { useEventAdmin } from "../layout/event-admin"

export function UpdatePortalScreen() {
	const { clubEvent } = useEventAdmin()
	const { mutateAsync: updatePortal, status, error } = useEventPatch()

	const handleUpdate = async (url: string) => {
		const data = {
			id: clubEvent.id,
			portal_url: url,
		} as Partial<ClubEventData>
		await updatePortal(data)
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12">
				<div className="card">
					<div className="card-body">
						<OverlaySpinner loading={status === "pending"} />
						<h4 className="card-header mb-2">Update the Event Portal</h4>
						<p>
							Copy the event portal url from Golf Genius. This will add a button to the portal on
							the event detail page.
						</p>
						<p className="info">
							Current portal url: {clubEvent.portalUrl ?? "--not available--"}
							{clubEvent.portalUrl && (
								<a href={clubEvent.portalUrl} className="ms-4" target="_blank" rel="noreferrer">
									View Portal
								</a>
							)}
						</p>
						<EventPortalForm onSubmit={handleUpdate} />
						{error && <ErrorDisplay error={error.message} delay={3000} onClose={() => void 0} />}
					</div>
				</div>
			</div>
		</div>
	)
}
