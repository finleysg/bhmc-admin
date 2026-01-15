import { GiLaurelsTrophy } from "react-icons/gi"
import { Link } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"
import { Player } from "../../models/player"

export interface ChampionCardProps {
	players: Player[]
	eventName: string
	flight: string
	score: number
	teamId: string
}

export function ChampionCard({ players, eventName, flight, score }: ChampionCardProps) {
	const { user } = useAuth()
	const topMargin = players.length > 1 ? "0" : "1rem"

	return (
		<div className="m-2 d-inline-block">
			<div className="champion-card">
				<div
					className={`champion-card__header ${
						flight.indexOf("gross") > 0 ? "champion-card__gross" : "champion-card__net"
					}`}
				>
					<span className="champion-card__icon">
						<GiLaurelsTrophy />
					</span>
					<span className="champion-card__event">{eventName}</span>
					<span className="champion-card__flight">{flight}</span>
				</div>
				<div className="champion-card__score">{score}</div>
				<div className="champion-card__player">
					{players.map((p) =>
						user.isAuthenticated ? (
							<p key={p.id} className="mb-1" style={{ marginTop: topMargin }}>
								<Link to={`/directory/${p.id}`}>{p.name}</Link>
							</p>
						) : (
							<p key={p.id} className="mb-1">
								{p.name}
							</p>
						),
					)}
				</div>
			</div>
		</div>
	)
}
