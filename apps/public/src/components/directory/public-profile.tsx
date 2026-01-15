import { PropsWithChildren } from "react"

import { useBoardMembers } from "../../hooks/use-board-members"
import { usePlayer } from "../../hooks/use-player"
import { usePlayerAces } from "../../hooks/use-player-aces"
import { usePlayerChampionships } from "../../hooks/use-player-champions"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { AceBadge } from "./ace-badge"
import { BoardMemberBadge } from "./board-member-badge"
import { MemberBadge } from "./member-badge"
import { PlayerTees } from "./player-tees"
import { ProfileImage } from "./profile-image"
import { Trophies } from "./trophies"

interface PlayerDetailProps {
	label: string
}

function PlayerDetail({ label, children }: PropsWithChildren<PlayerDetailProps>) {
	return (
		<p style={{ marginBottom: "1rem" }}>
			<span style={{ fontWeight: "bold" }}>{label}:</span> {children}
		</p>
	)
}

interface PlayerProfileProps {
	playerId: number
}

export function PlayerProfile({ playerId }: PlayerProfileProps) {
	const { data: player, isPending } = usePlayer(playerId)
	const { data: boardMembers } = useBoardMembers()
	const { data: championships } = usePlayerChampionships(playerId)
	const { data: aces } = usePlayerAces(playerId)

	const boardMember = boardMembers?.find((m) => m.player.id === playerId)
	const sortedChampionships = championships?.sort((a, b) => b.season - a.season) ?? []

	if (!player) {
		return null
	}

	return (
		<div className="card">
			<div className="card-body">
				<OverlaySpinner loading={isPending} />
				<h4 className="card-header mb-2">{player.name}</h4>
				<div className="row">
					<div className="col-md-4 col-12" style={{ marginBottom: "20px" }}>
						<ProfileImage player={player} />
					</div>
					<div className="col-md-4 col-12">
						<h5 className="text-primary mt-2 mb-2">Contact Information</h5>
						<PlayerDetail label="Email">
							<a href={`mailto: ${player.email}`}>{player.email}</a>
						</PlayerDetail>
						<PlayerDetail label="Phone">
							<a href={`tel: ${player.phoneNumber}`}>{player.phoneNumber}</a>
						</PlayerDetail>
						<h5 className="text-primary mt-4 mb-2">Player Details</h5>
						<MemberBadge player={player} />
						<PlayerTees player={player} />
						<AceBadge aces={aces ?? []} />
						<BoardMemberBadge boardMember={boardMember} />
					</div>
					<div className="col-md-4 col-12">
						<h5 className="text-primary mt-2 mb-2">First Place Finishes</h5>
						<Trophies championships={sortedChampionships} />
					</div>
				</div>
			</div>
		</div>
	)
}
