import { useMyFriends } from "../../hooks/use-my-friends"
import { CardContent } from "../card/content"
import { PlayerRow } from "../directory/search"

export function MyFriends() {
	const { data: friends } = useMyFriends()

	return (
		<CardContent contentKey="my-friends">
			<table>
				{friends?.map((player) => {
					return <PlayerRow key={player.id} player={player} />
				})}
			</table>
		</CardContent>
	)
}
