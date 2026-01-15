import { useState } from "react"

import { FaCalendarAlt } from "react-icons/fa"
import { Link } from "react-router-dom"

import { currentSeason } from "../utils/app-config"

interface SeasonMenuProps {
	baseUrl: string
	includeAll: boolean
	season: number
	startAt?: number
}

export function SeasonMenu({ baseUrl, includeAll, season, startAt }: SeasonMenuProps) {
	const [showMenu, setShowMenu] = useState(false)
	const startingYear = startAt ?? 2013

	const seasons = () => {
		const size = currentSeason - startingYear + 1
		return [...Array(size).keys()].map((i) => i + startingYear)
	}

	return (
		<div
			className="actions"
			role="button"
			style={{ zIndex: 10 }}
			tabIndex={0}
			onClick={() => setShowMenu(!showMenu)}
			onKeyDown={() => setShowMenu(!showMenu)}
		>
			<div className="dropdown">
				<span className="test-success-emphasis fw-bold">{season === 0 ? "All" : season}</span>{" "}
				<i className="actions__item text-success" title="Change Season">
					<FaCalendarAlt />
				</i>
				<div className={`dropdown-menu dropdown-menu-right ${showMenu ? "show" : ""}`}>
					{seasons()
						.reverse()
						.map((year) => {
							return (
								<Link
									key={year}
									onClick={() => setShowMenu(false)}
									to={`${baseUrl}/${year}`}
									className="dropdown-item"
								>
									{year}
								</Link>
							)
						})}
					{includeAll && (
						<Link
							key={"All"}
							onClick={() => setShowMenu(false)}
							to={`${baseUrl}/all`}
							className="dropdown-item"
						>
							All
						</Link>
					)}
				</div>
			</div>
		</div>
	)
}
