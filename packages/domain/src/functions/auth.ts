import { DjangoUserResponse, DjangoUser } from "../types"

// Helper function to transform API response
export function transformDjangoUser(response: DjangoUserResponse): DjangoUser {
	return {
		id: response.id,
		email: response.email,
		firstName: response.first_name,
		lastName: response.last_name,
		isActive: response.is_active,
		isStaff: response.is_staff,
		isSuperuser: response.is_superuser,
		ghin: response.ghin,
		birthDate: response.birth_date,
	}
}
