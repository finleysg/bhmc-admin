import { Link } from "react-router-dom"

import { isMobile } from "../styles/media-queries"

function Logo() {
	return (
		<div className="header__logo">
			<h1>
				<Link to="/home">{isMobile() ? "BHMC" : "Bunker Hills Men's Golf Club"}</Link>
			</h1>
		</div>
	)
}

export { Logo }
