import { ComponentPropsWithoutRef, PropsWithChildren, useState } from "react"

import { Link } from "react-router-dom"

import { getMonthName } from "./calendar"

interface MonthMenuProps extends PropsWithChildren<ComponentPropsWithoutRef<"div">> {
	currentYear: number
}

export function MonthMenu({ children, currentYear, ...rest }: MonthMenuProps) {
	const [showMenu, setShowMenu] = useState(false)
	const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

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
					{months.map((m) => {
						return (
							<Link
								key={m}
								to={`/calendar/${currentYear}/${getMonthName(m).toLowerCase()}`}
								className="nav-link"
								style={{ padding: ".5rem 1rem" }}
							>
								{getMonthName(m)}
							</Link>
						)
					})}
				</div>
			</div>
		</div>
	)
}
