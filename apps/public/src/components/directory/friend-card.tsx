import { ComponentPropsWithoutRef } from "react"

import { PiWarningFill } from "react-icons/pi"

import { Player } from "../../models/player"

interface FriendCardProps extends Omit<ComponentPropsWithoutRef<"button">, "onClick"> {
	friend: Player
	onClick: (friend: Player) => void
}

export function FriendCard({ friend, onClick, ...rest }: FriendCardProps) {
	return (
		<button
			onClick={() => onClick(friend)}
			className="list-group-item list-group-item-action text-start"
			{...rest}
		>
			{!friend.isMember && (
				<span className="text-warning">
					<PiWarningFill />
				</span>
			)}
			{friend.name}
		</button>
	)
}
