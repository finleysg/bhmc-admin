import { Link } from "react-router-dom"

import { AuthMenu } from "./auth-menu"

export function AuthHeader() {
	return (
		<nav className="navbar navbar-expand-lg navbar-dark bg-primary">
			<div className="logo">
				<Link className="navbar-brand" to={"/home"}>
					Bunker Hills Men&apos;s Golf Club
				</Link>
			</div>
			<div className="collapse navbar-collapse">
				<ul className="mr-auto"></ul>
				<AuthMenu />
			</div>
		</nav>
	)
}
