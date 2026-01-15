import { ComponentPropsWithoutRef } from "react"

import { Link } from "react-router-dom"

export interface AdminCardProps extends ComponentPropsWithoutRef<"div"> {
	title: string
	description: string
	action: string
}

export function AdminCard({ title, description, action, ...rest }: AdminCardProps) {
	return (
		<div className="card text-bg-light admin-card" {...rest}>
			<div className="card-body">
				<h5 className="card-title">{title}</h5>
				<p className="card-text">{description}</p>
				<Link className="card-link" to={action}>
					Go
				</Link>
			</div>
		</div>
	)
}

export function CloneEventsCard() {
	return (
		<AdminCard
			title="Clone Events"
			action="clone-events"
			description="Create new events by copying existing events."
		/>
	)
}

export function MembershipReportCard() {
	return (
		<AdminCard
			title="Membership Report"
			action="membership-report"
			description="View and/or download a report listing the current season's members."
		/>
	)
}

export function UploadPhotoCard() {
	return (
		<AdminCard
			title="Upload Photo(s)"
			action="upload-photo"
			description="Upload one or more photos to the club's photo gallery."
		/>
	)
}

export function ClubDocumentsCard() {
	return (
		<AdminCard
			title="Club Documents"
			action="club-documents"
			description="Upload or refresh a club document. This is a document with a designated display location on the website, such as your club by-laws or a monthly financial statement."
		/>
	)
}
