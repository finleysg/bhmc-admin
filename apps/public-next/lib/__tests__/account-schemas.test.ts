import { ChangePasswordSchema, PlayerUpdateSchema } from "../schemas/account"

describe("PlayerUpdateSchema", () => {
	it("validates a complete player update", () => {
		const result = PlayerUpdateSchema.safeParse({
			first_name: "John",
			last_name: "Doe",
			email: "john@example.com",
			ghin: "1234567",
			birth_date: "1985-03-15",
			phone_number: "612-555-1234",
		})
		expect(result.success).toBe(true)
	})

	it("requires first_name", () => {
		const result = PlayerUpdateSchema.safeParse({
			first_name: "",
			last_name: "Doe",
			email: "john@example.com",
		})
		expect(result.success).toBe(false)
	})

	it("requires last_name", () => {
		const result = PlayerUpdateSchema.safeParse({
			first_name: "John",
			last_name: "",
			email: "john@example.com",
		})
		expect(result.success).toBe(false)
	})

	it("validates email format", () => {
		const result = PlayerUpdateSchema.safeParse({
			first_name: "John",
			last_name: "Doe",
			email: "not-an-email",
		})
		expect(result.success).toBe(false)
	})

	it("allows empty optional fields", () => {
		const result = PlayerUpdateSchema.safeParse({
			first_name: "John",
			last_name: "Doe",
			email: "john@example.com",
			ghin: "",
			birth_date: "",
			phone_number: "",
		})
		expect(result.success).toBe(true)
	})

	it("allows omitted optional fields", () => {
		const result = PlayerUpdateSchema.safeParse({
			first_name: "John",
			last_name: "Doe",
			email: "john@example.com",
		})
		expect(result.success).toBe(true)
	})
})

describe("ChangePasswordSchema", () => {
	it("validates matching passwords", () => {
		const result = ChangePasswordSchema.safeParse({
			current_password: "oldpassword",
			new_password: "newpassword123",
			re_new_password: "newpassword123",
		})
		expect(result.success).toBe(true)
	})

	it("rejects mismatched passwords", () => {
		const result = ChangePasswordSchema.safeParse({
			current_password: "oldpassword",
			new_password: "newpassword123",
			re_new_password: "different",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join("."))
			expect(paths).toContain("re_new_password")
		}
	})

	it("requires minimum 8 character new password", () => {
		const result = ChangePasswordSchema.safeParse({
			current_password: "oldpassword",
			new_password: "short",
			re_new_password: "short",
		})
		expect(result.success).toBe(false)
	})

	it("requires current_password", () => {
		const result = ChangePasswordSchema.safeParse({
			current_password: "",
			new_password: "newpassword123",
			re_new_password: "newpassword123",
		})
		expect(result.success).toBe(false)
	})
})
