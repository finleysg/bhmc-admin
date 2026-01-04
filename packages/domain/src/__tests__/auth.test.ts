import { transformDjangoUser } from "../functions/auth"
import type { DjangoUserResponse } from "../types"

describe("transformDjangoUser", () => {
	it("transforms snake_case properties to camelCase", () => {
		const response: DjangoUserResponse = {
			id: 1,
			email: "john@example.com",
			first_name: "John",
			last_name: "Doe",
			is_active: true,
			is_staff: false,
			is_superuser: false,
			ghin: "12345",
			birth_date: "1990-01-15",
			player_id: 100,
		}

		const result = transformDjangoUser(response)

		expect(result.id).toBe(1)
		expect(result.email).toBe("john@example.com")
		expect(result.firstName).toBe("John")
		expect(result.lastName).toBe("Doe")
		expect(result.isActive).toBe(true)
		expect(result.isStaff).toBe(false)
		expect(result.isSuperuser).toBe(false)
		expect(result.ghin).toBe("12345")
		expect(result.birthDate).toBe("1990-01-15")
		expect(result.playerId).toBe(100)
	})

	it("handles null optional values", () => {
		const response: DjangoUserResponse = {
			id: 2,
			email: "jane@example.com",
			first_name: "Jane",
			last_name: "Smith",
			is_active: true,
			is_staff: true,
			is_superuser: true,
			ghin: null,
			birth_date: null,
			player_id: 200,
		}

		const result = transformDjangoUser(response)

		expect(result.ghin).toBeNull()
		expect(result.birthDate).toBeNull()
	})

	it("preserves all boolean flags correctly", () => {
		const staffUser: DjangoUserResponse = {
			id: 3,
			email: "staff@example.com",
			first_name: "Staff",
			last_name: "User",
			is_active: true,
			is_staff: true,
			is_superuser: false,
			ghin: null,
			birth_date: null,
			player_id: 300,
		}

		const result = transformDjangoUser(staffUser)

		expect(result.isActive).toBe(true)
		expect(result.isStaff).toBe(true)
		expect(result.isSuperuser).toBe(false)
	})

	it("preserves inactive user state", () => {
		const inactiveUser: DjangoUserResponse = {
			id: 4,
			email: "inactive@example.com",
			first_name: "Inactive",
			last_name: "User",
			is_active: false,
			is_staff: false,
			is_superuser: false,
			ghin: null,
			birth_date: null,
			player_id: 400,
		}

		const result = transformDjangoUser(inactiveUser)

		expect(result.isActive).toBe(false)
	})
})
