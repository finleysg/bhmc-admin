import { useEffect } from "react"

import { Outlet, useNavigate } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"
import { AdminSubheader } from "./admin-subhead"

export function Admin() {
	const { user } = useAuth()
	const navigate = useNavigate()

	useEffect(() => {
		if (!user.isAdmin() && !user.isUnknown()) {
			navigate("/")
		}
	}, [user, navigate])

	return (
		<div className="admin-content__inner">
			<AdminSubheader />
			<Outlet />
		</div>
	)
}
