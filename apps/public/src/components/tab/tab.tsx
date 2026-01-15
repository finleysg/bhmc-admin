import { PropsWithChildren } from "react"

import { Link, LinkProps, useMatch } from "react-router-dom"

export function Tab({ to, children }: PropsWithChildren<Pick<LinkProps, "to">>) {
	const route = to.toString() ?? "/"
	const match = useMatch(route) !== null
	return (
		<li className="nav-item">
			<Link
				to={to}
				className={match ? "nav-link active" : "nav-link"}
				role="tab"
				aria-controls={route}
				aria-selected={match}
			>
				{children}
			</Link>
		</li>
	)
}
