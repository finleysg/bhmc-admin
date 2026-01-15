import { ComponentPropsWithoutRef } from "react"

import { useNavigate } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"
import { ClubEventProps } from "../../models/common-props"
import { isMobile } from "../../styles/media-queries"

export function EventAdminButton({
	clubEvent,
	...rest
}: ComponentPropsWithoutRef<"button"> & ClubEventProps) {
	const { user } = useAuth()
	const navigate = useNavigate()

	if (user.isAdmin()) {
		const buttonText = isMobile() ? "Admin" : "Event Administration"
		return (
			<button
				className="btn btn-secondary btn-sm"
				onClick={() => navigate(clubEvent.adminUrl)}
				{...rest}
			>
				{buttonText}
			</button>
		)
	}
	return null
}
