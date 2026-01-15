import { AdminCard } from "./admin-cards"

interface EventAdminMenuProps {
	eventId: number
}

export function EventReportCard() {
	return (
		<AdminCard
			title="Event Report"
			action={"event-report"}
			description="View and/or download a report of all players signed up for this event."
		/>
	)
}

export function PaymentReportCard() {
	return (
		<AdminCard
			title="Payment Report"
			action={"payment-report"}
			description="View and/or download a report listing payment details for this event."
		/>
	)
}

export function SkinsReportCard() {
	return (
		<AdminCard
			title="Skins Report"
			action={"skins-report"}
			description="View and/or download a report listing player who have signed up for skins."
		/>
	)
}

export function RegistrationNotesCard() {
	return (
		<AdminCard
			title="Registration Notes"
			action={"registration-notes"}
			description="View and/or download all registration notes collected for this event."
		/>
	)
}

export function ManagePlayersCard() {
	return (
		<AdminCard
			title="Manage Players"
			action={"manage-players"}
			description="Handle requests to add players, move players, drop players, or swap out one player for another."
		/>
	)
}

export function UpdatePortalCard() {
	return (
		<AdminCard
			title="Update Portal"
			action={"update-portal"}
			description="Add or update the url to the Golf Genius portal page."
		/>
	)
}

export function ManageDocumentsCard() {
	return (
		<AdminCard
			title="Manage Documents"
			action={"manage-documents"}
			description="Upload or replace event documents such as tee times, flights, or results."
		/>
	)
}

export function ImportLeaderboardCard() {
	return (
		<AdminCard
			title="Import Leaderboard"
			action={"import-leaderboard"}
			description="Upload the Golf Genius leaderboard file for this event. Optionally upload scores, points, and low scores."
		/>
	)
}

export function ImportPointsCard() {
	return (
		<AdminCard
			title="Import Points"
			action={"import-major-points"}
			description="Upload the Golf Genius points export file for this event."
		/>
	)
}

export function ImportChampionsCard() {
	return (
		<AdminCard
			title="Import Champions"
			action={"import-champions"}
			description="Upload a file with the first-place finishers of this event."
		/>
	)
}

export function ValidateSlotsCard() {
	return (
		<AdminCard
			title="Validate Teesheets"
			action={"view-slots"}
			description="View and, if necessary, recreate the slots players can sign up for in this event."
		/>
	)
}

export function AppendTeetimeCard() {
	return (
		<AdminCard
			title="Add a Teetime"
			action={"append-teetime"}
			description="Add an additional teetime for each course at the end of the teesheet."
		/>
	)
}

export function EventSettingsCard({ eventId }: EventAdminMenuProps) {
	return (
		<AdminCard
			title="Event Settings"
			action={`https://api.bhmc.org/admin/events/event/${eventId}/change/`}
			description="Open the event settings page in the backend administration website."
		/>
	)
}
