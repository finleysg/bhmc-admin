import React from "react"

import { Link, LinkProps } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"

export type CustomLinkProps = Omit<LinkProps, "to"> &
	React.RefAttributes<HTMLAnchorElement> & { redirectUrl?: string }

export function LoginButton({ redirectUrl, ...rest }: CustomLinkProps) {
	const { user } = useAuth()

	if (!user.isAuthenticated) {
		const redirect = redirectUrl ?? "/home"

		return (
			<Link
				className="btn btn-info btn-sm me-2"
				to={`/session/login?redirectUrl=${redirect}`}
				{...rest}
			>
				Login
			</Link>
		)
	}
}
