import { hasAdminRole, transformDjangoUser } from "../functions/auth"
import type { DjangoUser, DjangoUserResponse } from "../types"

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
			groups: [{ name: "Event Admin" }, { name: "Paul Helpers" }],
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
		expect(result.groups).toEqual(["Event Admin", "Paul Helpers"])
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
			groups: [],
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
			groups: [],
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
			groups: [],
		}

		const result = transformDjangoUser(inactiveUser)

		expect(result.isActive).toBe(false)
	})
})

describe("hasAdminRole", () => {
	const user = (overrides: Partial<DjangoUser>): DjangoUser => ({
		id: 1,
		email: "a@example.com",
		firstName: "A",
		lastName: "B",
		isActive: true,
		isStaff: false,
		isSuperuser: false,
		ghin: null,
		birthDate: null,
		playerId: 1,
		groups: [],
		...overrides,
	})

	it("grants a role to a member of its group", () => {
		expect(hasAdminRole(user({ groups: ["Event Admin"] }), ["event-admin"])).toBe(true)
		expect(hasAdminRole(user({ groups: ["Club Admin"] }), ["club-admin"])).toBe(true)
	})

	it("denies a role the user's groups do not grant", () => {
		expect(hasAdminRole(user({ groups: ["Club Admin"] }), ["event-admin"])).toBe(false)
		expect(hasAdminRole(user({ groups: ["Tournament Admin"] }), ["event-admin"])).toBe(false)
	})

	it("grants when any of several roles matches", () => {
		expect(hasAdminRole(user({ groups: ["Club Admin"] }), ["event-admin", "club-admin"])).toBe(true)
	})

	it("ignores the staff flag", () => {
		expect(hasAdminRole(user({ isStaff: true }), ["event-admin", "club-admin"])).toBe(false)
	})

	it("grants every role to a superuser", () => {
		expect(hasAdminRole(user({ isSuperuser: true }), ["event-admin"])).toBe(true)
		expect(hasAdminRole(user({ isSuperuser: true }), ["club-admin"])).toBe(true)
	})
})
