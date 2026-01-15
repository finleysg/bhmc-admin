import { ComponentPropsWithoutRef } from "react"

import { ClubEventProps } from "../../models/common-props"

export function EventPortalButton({
	clubEvent,
	...rest
}: ClubEventProps & ComponentPropsWithoutRef<"a">) {
	if (clubEvent?.portalUrl) {
		return (
			<a
				className="btn btn-info btn-sm"
				href={clubEvent.portalUrl}
				target="_blank"
				rel="noreferrer"
				{...rest}
			>
				Leaderboard
			</a>
		)
	}
	return null
}
