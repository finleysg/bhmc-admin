import {
	CloneEventsCard,
	ClubDocumentsCard,
	MembershipReportCard,
	UploadPhotoCard,
} from "./admin-cards"

export function AdminMenu() {
	return (
		<div className="row row-cols-1 row-cols-md-4 g-4 mx-auto">
			<div className="col">
				<CloneEventsCard />
			</div>
			<div className="col">
				<MembershipReportCard />
			</div>
			<div className="col">
				<UploadPhotoCard />
			</div>
			<div className="col">
				<ClubDocumentsCard />
			</div>
		</div>
	)
}
