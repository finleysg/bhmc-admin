import { Link } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"
import { PlayerProps } from "../../models/common-props"

export function PlayerProfileLink({ player }: PlayerProps) {
	const { user } = useAuth()

	return (
		<div style={{ textAlign: "left" }}>
			{user.isAuthenticated ? (
				<Link to={`/directory/${player.id}`}>{player.name}</Link>
			) : (
				<span>{player.name}</span>
			)}
		</div>
	)
}
