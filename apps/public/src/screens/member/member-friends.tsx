import { useRef, useState } from "react"

import { Typeahead, TypeaheadRef } from "react-bootstrap-typeahead"
import { MdClose, MdPersonAdd } from "react-icons/md"
import { toast } from "react-toastify"

import { PlayerRow } from "../../components/directory/search"
import { useAddFriend, useMyFriends } from "../../hooks/use-my-friends"
import { usePlayers } from "../../hooks/use-players"
import { Player } from "../../models/player"

interface PlayerLookup {
	id: number
	label: string
}

export function MemberFriendsScreen() {
	const [showPicker, setShowPicker] = useState(false)
	const typeaheadRef = useRef<TypeaheadRef>(null)
	const { data: friends } = useMyFriends()
	const { data: players } = usePlayers()
	const { mutate: addFriend } = useAddFriend()

	const playerOptions =
		players?.map((p) => ({
			id: p.id,
			label: p.name,
		})) ?? []

	const handleSelect = (selected: PlayerLookup) => {
		if (selected) {
			addFriend(selected.id, {
				onSuccess: () => {
					toast.success(`${selected.label} added as friend`)
					typeaheadRef.current?.clear()
				},
			})
		}
	}

	return (
		<div className="content__inner">
			<div className="container py-4">
				<div style={{ maxWidth: "400px" }}>
					<h2 className="mb-4 text-primary">My Friends</h2>

					{!showPicker && (
						<button className="btn btn-link p-0 mb-3" onClick={() => setShowPicker(true)}>
							<MdPersonAdd className="me-1" /> Add Friend
						</button>
					)}

					{showPicker && (
						<div className="mb-3 d-flex align-items-center gap-2">
							<Typeahead
								id="friend-search"
								ref={typeaheadRef}
								filterBy={["label"]}
								placeholder="Search for player..."
								minLength={3}
								highlightOnlyResult
								onChange={(selected) => handleSelect(selected[0] as PlayerLookup)}
								options={playerOptions}
							/>
							<button
								className="btn btn-link p-0"
								onClick={() => setShowPicker(false)}
								aria-label="Close"
							>
								<MdClose />
							</button>
						</div>
					)}

					<p className="text-muted">Click the star to remove from your list</p>

					{friends && friends.length > 0 ? (
						<table className="w-100">
							<tbody>
								{friends.map((player: Player) => (
									<PlayerRow key={player.id} player={player} />
								))}
							</tbody>
						</table>
					) : (
						<p className="text-muted">You haven&apos;t added any friends yet.</p>
					)}
				</div>
			</div>
		</div>
	)
}
