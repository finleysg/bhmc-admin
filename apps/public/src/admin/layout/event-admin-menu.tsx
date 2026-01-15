import { EventType } from "../../models/codes"
import { useEventAdmin } from "./event-admin"
import {
	AppendTeetimeCard,
	EventReportCard,
	EventSettingsCard,
	ImportChampionsCard,
	ImportLeaderboardCard,
	ImportPointsCard,
	ManageDocumentsCard,
	ManagePlayersCard,
	PaymentReportCard,
	RegistrationNotesCard,
	SkinsReportCard,
	UpdatePortalCard,
	ValidateSlotsCard,
} from "./event-admin-cards"

export function EventAdminMenu() {
	const { clubEvent } = useEventAdmin()

	return (
		<div>
			<div className="row row-cols-1 row-cols-md-4 g-4">
				<div className="col">
					<EventReportCard />
				</div>
				<div className="col">
					<PaymentReportCard />
				</div>
				<div className="col">
					<SkinsReportCard />
				</div>
				<div className="col">
					<RegistrationNotesCard />
				</div>
				<div className="col">
					<ManagePlayersCard />
				</div>
				<div className="col">
					<UpdatePortalCard />
				</div>
				<div className="col">
					<ManageDocumentsCard />
				</div>
				{clubEvent.eventType === EventType.Weeknight && clubEvent.registrationWindow === "past" && (
					<div className="col">
						<ImportLeaderboardCard />
					</div>
				)}
				{clubEvent.eventType === EventType.Major && clubEvent.registrationWindow === "past" && (
					<div className="col">
						<ImportPointsCard />
					</div>
				)}
				{clubEvent.eventType === EventType.Major && clubEvent.registrationWindow === "past" && (
					<div className="col">
						<ImportChampionsCard />
					</div>
				)}
				{clubEvent.canChoose && clubEvent.registrationWindow === "future" && (
					<div className="col">
						<ValidateSlotsCard />
					</div>
				)}
				{clubEvent.canChoose && (
					<div className="col">
						<AppendTeetimeCard />
					</div>
				)}
				<div className="col">
					<EventSettingsCard eventId={clubEvent.id} />
				</div>
			</div>
		</div>
	)
}
