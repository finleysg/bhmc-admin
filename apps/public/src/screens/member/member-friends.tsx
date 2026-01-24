import { useMyFriends } from "../../hooks/use-my-friends"
import { PlayerRow } from "../../components/directory/search"

export function MemberFriendsScreen() {
	const { data: friends } = useMyFriends()

	return (
		<div className="content__inner">
			<div className="container py-4">
				<h1 className="mb-4">My Friends</h1>
				{friends && friends.length > 0 ? (
					<table className="w-100">
						<tbody>
							{friends.map((player) => (
								<PlayerRow key={player.id} player={player} />
							))}
						</tbody>
					</table>
				) : (
					<p className="text-muted">You haven&apos;t added any friends yet.</p>
				)}
			</div>
		</div>
	)
}
