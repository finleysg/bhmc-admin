import React, { ComponentPropsWithoutRef, PropsWithChildren, useCallback } from "react"

import { Link } from "react-router-dom"

import { currentSeason } from "../../utils/app-config"

interface YearMenuProps extends PropsWithChildren<ComponentPropsWithoutRef<"div">> {
	currentMonth: string
}

export function YearMenu({ children, currentMonth, ...rest }: YearMenuProps) {
	const [showMenu, setShowMenu] = React.useState(false)

	const seasons = useCallback(() => {
		const startAt = 2017
		const size = currentSeason - startAt + 1
		return [...Array(size).keys()].map((i) => i + startAt).reverse()
	}, [])

	return (
		<div
			className="actions actions--inverse"
			role="menu"
			tabIndex={0}
			onClick={() => setShowMenu(!showMenu)}
			onKeyDown={() => setShowMenu(!showMenu)}
			{...rest}
		>
			<div className="dropdown">
				{children}
				<div className={`dropdown-menu ${showMenu ? "show" : ""}`}>
					{seasons().map((season) => {
						return (
							<Link
								key={season}
								to={`/calendar/${season}/${currentMonth}`}
								className="nav-link"
								style={{ padding: ".5rem 1rem" }}
							>
								{season}
							</Link>
						)
					})}
				</div>
			</div>
		</div>
	)
}
