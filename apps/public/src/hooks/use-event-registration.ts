import { useContext } from "react"

import { EventRegistrationContext } from "../context/registration-context"

export function useEventRegistration() {
	const context = useContext(EventRegistrationContext)
	if (context === null || context === undefined) {
		throw new Error(`useEventRegistration must be used within a RegistrationProvider`)
	}
	return context
}
