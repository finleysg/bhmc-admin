import React from "react"

import { Link, useNavigate } from "react-router-dom"

import { useAuth } from "../hooks/use-auth"
import * as colors from "../styles/colors"

export function UserMenu() {
	const [showMenu, setShowMenu] = React.useState(false)
	const { user, logout } = useAuth()
	const navigate = useNavigate()

	const handleLogout = () => {
		setShowMenu(false)
		logout.mutate()
		navigate("/home")
	}

	const anonymousMenu = () => {
		return (
			<li style={{ float: "right", color: colors.base }}>
				<ul style={{ listStyle: "none" }}>
					<li>
						<Link to="/session/login" className="text-white">
							Login
						</Link>
					</li>
				</ul>
			</li>
		)
	}

	const authenticatedMenu = () => {
		return (
			<li className="nav-item dropdown">
				<button className="nav-link dropdown-toggle" onClick={() => setShowMenu(!showMenu)}>
					{user.name}
				</button>
				<div className={`dropdown-menu dropdown-menu-right ${showMenu ? "show" : ""}`}>
					<Link onClick={() => setShowMenu(false)} to="my-account" className="dropdown-item">
						My Account
					</Link>
					<Link onClick={() => setShowMenu(false)} to="my-activity" className="dropdown-item">
						My Activity
					</Link>
					<div className="dropdown-divider"></div>
					<button onClick={handleLogout} className="dropdown-item">
						Logout
					</button>
				</div>
			</li>
		)
	}

	if (user.isAuthenticated) {
		return authenticatedMenu()
	}

	return anonymousMenu()
}
