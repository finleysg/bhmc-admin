import { useEffect } from "react"

import { useNavigate } from "react-router-dom"

import { CardContent } from "../components/card/content"
import { PlayerSearch } from "../components/directory/search"
import { useAuth } from "../hooks/use-auth"

export function DirectoryScreen() {
	const { user } = useAuth()
	const navigate = useNavigate()

	useEffect(() => {
		if (!user.isAuthenticated) {
			navigate("/home")
		}
	}, [user, navigate])

	return (
		<div className="content__inner">
			<div className="row">
				<div className="col-md-6">
					<CardContent contentKey="directory">
						<PlayerSearch />
					</CardContent>
				</div>
				<div className="col-md-6">{/* <PlayerProfile playerId={selectedId} /> */}</div>
			</div>
		</div>
	)
}
