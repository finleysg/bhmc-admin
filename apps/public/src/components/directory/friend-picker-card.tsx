import { useMediaQuery } from "usehooks-ts"

import { FriendPickerList, FriendPickerProps } from "./friend-picker-list"

export function FriendPickerCard({ clubEvent, onSelect }: FriendPickerProps) {
	const matches = useMediaQuery("(min-width: 768px)")

	if (!matches) {
		return null
	}

	return (
		<div className="card">
			<div className="card-body">
				<h5 className="card-header mb-2">My Friends</h5>
				<FriendPickerList clubEvent={clubEvent} onSelect={onSelect} />
			</div>
		</div>
	)
}
