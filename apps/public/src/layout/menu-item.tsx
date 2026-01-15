import { ReactNode } from "react"

import { Link as RouterLink, useMatch } from "react-router-dom"

import { useLayout } from "../hooks/use-layout"

interface IMenuItem {
	path: string
	icon: ReactNode
	name: string
}

function MenuItem(props: IMenuItem) {
	const { path, icon, name } = props
	const { closeSidebar } = useLayout()
	const match = useMatch(path)

	const linkPath = path.startsWith("/") ? path : `/${path}`

	return (
		<li className={match ? "navigation__active" : ""}>
			<RouterLink to={linkPath} onClick={closeSidebar}>
				<i>{icon}</i>
				{name}
			</RouterLink>
		</li>
	)
}

export { MenuItem }
