import { Outlet, useNavigate, useOutletContext } from "react-router-dom"

import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { usePlayerRegistration } from "../../hooks/use-player-registrations"
import { ClubEvent } from "../../models/club-event"
import { Registration } from "../../models/registration"
import { GetGroupStartName } from "../../models/reserve"
import { useCurrentEvent } from "./event-detail"

type ManageAction =
	| "addPlayers"
	| "dropPlayers"
	| "moveGroup"
	| "replacePlayer"
	| "addNotes"
	| "updateRegistration"

const OPTIONS: {
	key: ManageAction
	title: string
	description: string
}[] = [
	{
		key: "addPlayers",
		title: "Add Players",
		description: "Add one or more players to your group, assuming there is space available",
	},
	{
		key: "dropPlayers",
		title: "Drop Players",
		description:
			"Drop one or more players from your group. A refund will be triggered for fees paid.",
	},
	{
		key: "moveGroup",
		title: "Move Group",
		description: "Move your group to another open spot.",
	},
	{
		key: "replacePlayer",
		title: "Replace Player",
		description: "Replace one of the players in your group with another player.",
	},
	{
		key: "addNotes",
		title: "Add Notes",
		description: "Add a special request or other notes to your registration.",
	},
	{
		key: "updateRegistration",
		title: "Get in Skins",
		description: "Pay for skins or other extras.",
	},
]

export type RegistrationContextType = { clubEvent: ClubEvent; registration: Registration }

// eslint-disable-next-line react-refresh/only-export-components
export function useManageRegistration() {
	return useOutletContext<RegistrationContextType>()
}

export function ManageRegistrationScreen() {
	const { clubEvent } = useCurrentEvent()
	const { data: player, isLoading: isPlayerLoading } = useMyPlayerRecord()
	const { data: registration, isLoading } = usePlayerRegistration(player?.id, clubEvent.id)
	const navigate = useNavigate()

	if (isLoading || isPlayerLoading) {
		return <OverlaySpinner loading={true} />
	}
	if (!registration) {
		return (
			<div className="row">
				<div className="col-12 col-md-6">
					<div className="card border border-primary mb-4">
						<div className="card-body">
							<h4 className="card-header mb-2 text-primary">Manage My Group</h4>
							<p className="text-muted">No registration found.</p>
							<hr />
							<div style={{ textAlign: "right" }}>
								<button className="btn btn-secondary" onClick={() => navigate("../")}>
									Back
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return <Outlet context={{ clubEvent, registration } satisfies RegistrationContextType} />
}

export function ManageRegistrationMenu() {
	const { clubEvent, registration } = useManageRegistration()
	const { initiateStripeSession, loadRegistration } = useEventRegistration()
	const { data: player } = useMyPlayerRecord()
	const navigate = useNavigate()

	// Deriving course and start info is messy
	const course = clubEvent.courses.find((c) => c.id === registration.courseId)
	const courseName = course?.name
	const startingHoleId = registration.slots[0]?.holeId
	const startingHole = course?.holes.find((h) => h.id === startingHoleId)
	const startingHoleNumber = startingHole ? startingHole.holeNumber : 1
	const startingOrder = registration.slots[0]?.startingOrder ?? 0
	const startName = GetGroupStartName(clubEvent, startingHoleNumber, startingOrder)

	const handleAction = async (action: ManageAction) => {
		if (action === "updateRegistration") {
			if (player) {
				await loadRegistration(player)
				initiateStripeSession()
				navigate("../edit")
			}
		} else if (action === "addPlayers") {
			navigate("add")
		} else if (action === "replacePlayer") {
			navigate("replace")
		} else if (action === "moveGroup") {
			navigate("move")
		} else if (action === "dropPlayers") {
			navigate("drop")
		} else if (action === "addNotes") {
			navigate("notes")
		}
	}

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2 text-primary">
							Manage My Group
							<span className="text-muted fs-6">
								&nbsp;({course ? `${courseName} ${startName}` : startName})
							</span>
						</h4>
						<ul className="list-group">
							{OPTIONS.filter((opt) => opt.key !== "moveGroup" || clubEvent.canChoose).map(
								(opt) => (
									<li key={opt.key} className="list-group-item border-0">
										<button
											type="button"
											className="btn btn-link text-success text-bold ps-0"
											style={{ textDecoration: "none" }}
											onClick={() => handleAction(opt.key)}
										>
											{opt.title}
										</button>
										<div className="text-muted fst-italic small mt-1">{opt.description}</div>
									</li>
								),
							)}
						</ul>
						<hr />
						<div style={{ textAlign: "right" }}>
							<button className="btn btn-secondary" onClick={() => navigate("../")}>
								Back
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
