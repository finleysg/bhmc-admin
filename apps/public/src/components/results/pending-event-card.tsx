import { format } from "date-fns"

interface PendingEventCardProps {
	eventName: string
	eventDate: Date
}

export function PendingEventCard({ eventName, eventDate }: PendingEventCardProps) {
	return (
		<div className="card mb-4 border-secondary bg-light">
			<div className="card-body">
				<div className="d-flex justify-content-between align-items-start mb-3">
					<div>
						<h4 className="card-header mb-1">{eventName}</h4>
						<p className="text-muted mb-0">{format(eventDate, "MMMM d, yyyy")}</p>
					</div>
					<span className="badge bg-primary">Registered</span>
				</div>

				<div className="text-muted fst-italic">Waiting for results</div>
			</div>
		</div>
	)
}
