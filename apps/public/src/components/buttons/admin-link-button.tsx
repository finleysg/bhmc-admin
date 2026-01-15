import { ComponentPropsWithoutRef, ReactNode } from "react"

import { PiPencilLine } from "react-icons/pi"
import { To, useNavigate } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"

interface AdminLinkProps extends ComponentPropsWithoutRef<"div"> {
	to: To
	label: string
	icon?: ReactNode
}

export function AdminLinkButton({ to, label, icon, ...rest }: AdminLinkProps) {
	const { user } = useAuth()
	const navigate = useNavigate()

	if (user.isAdmin()) {
		return (
			<div style={{ position: "absolute", top: 3, right: 3 }} {...rest}>
				<button className="action-button" title={label} onClick={() => navigate(to)}>
					{icon ?? <PiPencilLine />}
				</button>
			</div>
		)
	}
	return null
}
