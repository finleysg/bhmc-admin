import { PiWarningFill } from "react-icons/pi"

import { useEventRegistration } from "../../hooks/use-event-registration"
import { useMyFriends } from "../../hooks/use-my-friends"
import { ClubEvent } from "../../models/club-event"
import { RegistrationType } from "../../models/codes"
import { Player } from "../../models/player"

export interface FriendPickerProps {
	clubEvent: ClubEvent
	onSelect: (friend: Player) => void
}

export function FriendPickerList({ clubEvent, onSelect }: FriendPickerProps) {
	const { data: friends } = useMyFriends()
	const { setError } = useEventRegistration()

	const handleSelect = (player: Player) => {
		if (clubEvent.registrationType === RegistrationType.MembersOnly && !player.isMember) {
			setError(new Error(`Not eligible! ${player.name} is not a member.`))
			return
		}
		onSelect(player)
	}

	return (
		<>
			{Boolean(friends?.length) || (
				<p>
					You don&apos;t currently have any members in your Friends list. Anyone you sign up for an
					event will automatically be added to your Friends list.
				</p>
			)}
			{Boolean(friends?.length) && (
				<>
					<div className="list-group mb-3">
						{friends?.map((friend) => {
							return (
								<button
									key={friend.id}
									onClick={() => handleSelect(friend)}
									className="list-group-item list-group-item-action text-start"
								>
									{!friend.isMember && (
										<span className="text-warning me-2">
											<PiWarningFill />
										</span>
									)}
									{friend.name}
								</button>
							)
						})}
					</div>
					<p>
						Click on a friend&apos;s name to add them to the event. Anyone you sign up for an event
						will automatically be added to your Friends list.
					</p>
					<p>
						<span className="text-warning me-2">
							<PiWarningFill />
						</span>
						<small className="fst-italic">Not a current member.</small>
					</p>
				</>
			)}
		</>
	)
}
