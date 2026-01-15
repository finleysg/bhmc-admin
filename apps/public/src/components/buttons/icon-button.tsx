import { PropsWithChildren } from "react"

import { Link, To } from "react-router-dom"

interface IconButtonProps {
	to: To
	color: string
}

export function IconButton({ to, color, children }: PropsWithChildren<IconButtonProps>) {
	return (
		<Link to={to} className={`btn btn--icon bg-${color}`}>
			<i>{children}</i>
		</Link>
	)
}
