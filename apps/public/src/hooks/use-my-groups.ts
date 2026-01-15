import { Groups } from "../models/codes"
import { useAuth } from "./use-auth"

export function useMyGroups() {
	const { user } = useAuth()
	const groups = []
	if (user.isAuthenticated) {
		groups.push(Groups.AuthenticatedUsers)
	} else {
		groups.push(Groups.Guests)
		return groups
	}
	if (user.isStaff) {
		groups.push(Groups.Administrators)
	}
	user.groups.forEach((g) => groups.push(g))
	return groups
}
