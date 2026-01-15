import { Link } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"
import { MajorChampionProps, SeasonProps } from "../../models/common-props"
import { MajorChampion } from "../../models/major-champion"

interface ChampionListProps extends SeasonProps {
	champions: MajorChampion[]
}

function ChampionRow({ champion }: MajorChampionProps) {
	const { user } = useAuth()
	const { player, score } = champion

	return (
		<div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}>
			<div style={{ flex: "1 1 50%" }}>{champion.flightDisplay()}</div>
			<div style={{ flex: "1 1 35%" }}>
				{user.isAuthenticated ? (
					<Link to={`/directory/${player.id}`}>{player.name}</Link>
				) : (
					<span>{player.name}</span>
				)}
			</div>
			<div style={{ flex: "1 1 15%" }}>{score}</div>
		</div>
	)
}

export function ChampionList({ champions, season }: ChampionListProps) {
	if (!champions || champions.length === 0) {
		return <p>No champions imported yet for {season}.</p>
	}

	const championsByEvent =
		champions.reduce((acc, value) => {
			if (!acc.has(value.eventName)) {
				acc.set(value.eventName, [])
			}
			acc.get(value.eventName)!.push(value)
			return acc
		}, new Map<string, MajorChampion[]>()) ?? new Map<string, MajorChampion[]>()

	return (
		<>
			{[...championsByEvent.entries()].map((entry) => (
				<div key={entry[0]} style={{ padding: ".5rem" }}>
					<h5 className="text-info">{entry[0]}</h5>
					{entry[1]?.map((c) => {
						return <ChampionRow key={c.id} champion={c} />
					})}
				</div>
			))}
		</>
	)
}
