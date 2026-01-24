import { useEffect } from "react"

import { Outlet, useNavigate } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"

export function Member() {
	const { user } = useAuth()
	const navigate = useNavigate()

	useEffect(() => {
		if (!user.isUnknown() && !user.isAuthenticated) {
			navigate("/session/login")
		}
	}, [user, navigate])

	if (user.isUnknown()) {
		return null
	}

	if (!user.isAuthenticated) {
		return null
	}

	return <Outlet />
}
