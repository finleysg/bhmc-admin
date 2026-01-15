import { useLayoutEffect } from "react"

import { useNavigate } from "react-router-dom"

import { Registration } from "../models/registration"

export function useEventRegistrationGuard(registration: Registration | null) {
	const navigate = useNavigate()

	useLayoutEffect(() => {
		if (!registration?.id) {
			navigate("../")
		}
	}, [navigate, registration?.id])
}
