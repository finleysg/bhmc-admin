import { Link } from "react-router-dom"

export function AuthMenu() {
	return (
		<ul className="navbar-nav">
			<li className="top-nav--active">
				<Link to={"/session/login"} className="nav-link">
					<p>Login</p>
				</Link>
			</li>
			<li className="">
				<Link to={"/session/account"} className="nav-link">
					<p>Create an Account</p>
				</Link>
			</li>
			<li className="">
				<Link to={"/session/reset-password"} className="nav-link">
					<p>Reset My Password</p>
				</Link>
			</li>
			<li>
				<Link to={"/home"} className="nav-link">
					<p>Home</p>
				</Link>
			</li>
		</ul>
	)
}
