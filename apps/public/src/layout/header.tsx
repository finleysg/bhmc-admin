import { Logo } from "./logo"
import { NavigationTrigger } from "./navigation-trigger"
import { UserMenu } from "./user-menu"

function Header() {
	return (
		<header className="header">
			<NavigationTrigger />
			<Logo />
			<ul className="top-nav">
				<UserMenu />
			</ul>
		</header>
	)
}

export { Header }
