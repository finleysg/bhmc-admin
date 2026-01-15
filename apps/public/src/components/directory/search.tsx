import React, { ChangeEvent } from "react"

import { debounce } from "lodash"
import { MdStar, MdStarBorder } from "react-icons/md"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"

import { useAddFriend, useMyFriends, useRemoveFriend } from "../../hooks/use-my-friends"
import { PlayerProps } from "../../models/common-props"
import { Player, PlayerApiSchema } from "../../models/player"
import * as colors from "../../styles/colors"
import { getMany } from "../../utils/api-client"
import { Spinner } from "../spinners/spinner"

function StarToggle({ player }: PlayerProps) {
	const [isFriend, setIsFriend] = React.useState(player.isFriend)
	const { mutate: add, status: addStatus } = useAddFriend()
	const { mutate: remove, status: removeStatus } = useRemoveFriend()
	const loading = addStatus === "pending" || removeStatus === "pending"

	const addFriend = (friend: Player) => {
		add(friend.id, {
			onSuccess: () => {
				toast.success(`${friend.name} added to your friends list`)
				setIsFriend(true)
			},
		})
	}

	const removeFriend = (friend: Player) => {
		remove(friend.id, {
			onSuccess: () => {
				toast.warn(`${friend.name} removed from your friends list`)
				setIsFriend(false)
			},
		})
	}

	const handleClick = () => {
		if (isFriend) {
			removeFriend(player)
		} else {
			addFriend(player)
		}
	}
	return (
		<div
			style={{
				display: "inline-block",
				fontSize: "1.5rem",
				cursor: "pointer",
				margin: "0 1rem 0 0",
			}}
			role="button"
			onClick={handleClick}
			onKeyDown={handleClick}
			tabIndex={0}
		>
			{loading ? (
				<Spinner style={{ verticalAlign: "middle" }} />
			) : isFriend ? (
				<MdStar style={{ verticalAlign: "middle", color: colors.success }} />
			) : (
				<MdStarBorder style={{ verticalAlign: "middle", color: colors.success }} />
			)}
		</div>
	)
}

export function PlayerRow({ player }: PlayerProps) {
	return (
		<>
			<tr>
				<td className="p-0">
					<StarToggle player={player} />
				</td>
				<td className="p-0">
					<h6 className="text-primary mb-0">{player.name}</h6>
				</td>
				<td className="p-0">
					<Link className="btn btn-link" to={`/directory/${player.id}`}>
						(view)
					</Link>
				</td>
			</tr>
			<tr>
				<td className="pb-2">&nbsp;</td>
				<td className="pb-2" colSpan={2}>
					<a href={`mailto:${player.email}`}>{player.email}</a>
				</td>
			</tr>
		</>
	)
}

export function PlayerSearch() {
	const [results, updateResults] = React.useState<Player[]>([])
	const { data: friends } = useMyFriends()

	const searchPlayers = React.useCallback(
		async (pattern: string) => {
			const results = await getMany(`players/search/?pattern=${pattern}`, PlayerApiSchema)
			const players = results.map((obj) => new Player(obj))
			players.forEach((p) => (p.isFriend = (friends?.findIndex((f) => f.id === p.id) ?? -1) >= 0))
			updateResults(players)
		},
		[friends],
	)

	const doSearch = React.useMemo(() => debounce(searchPlayers, 500), [searchPlayers])

	const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
		const pattern = e.target.value?.toLowerCase()
		if (pattern.length >= 3) {
			doSearch(pattern)
		}
	}

	return (
		<div>
			<div style={{ marginBottom: "20px" }}>
				<input
					type="text"
					className="form-control"
					placeholder="Search for players..."
					onChange={handleSearch}
				/>
			</div>
			<table>
				{results.map((player) => {
					return <PlayerRow key={player.id} player={player} />
				})}
			</table>
		</div>
	)
}
