import { diffChanges } from "../diff"

describe("diffChanges", () => {
	it("returns only the fields whose values changed", () => {
		expect(
			diffChanges(
				{ firstName: "Ada", phoneNumber: null, isMember: true },
				{ firstName: "Ada", phoneNumber: "612-555-0100", isMember: false },
			),
		).toEqual({
			phoneNumber: { before: null, after: "612-555-0100" },
			isMember: { before: true, after: false },
		})
	})

	it("returns nothing when no field changed", () => {
		expect(diffChanges({ roles: ["event-admin"] }, { roles: ["event-admin"] })).toEqual({})
	})

	it("compares arrays by contents", () => {
		expect(diffChanges({ roles: [] }, { roles: ["club-admin"] })).toEqual({
			roles: { before: [], after: ["club-admin"] },
		})
	})

	it("ignores fields of before that are not in after", () => {
		expect(diffChanges({ email: "a@example.com", ghin: "1" }, { ghin: "2" })).toEqual({
			ghin: { before: "1", after: "2" },
		})
	})

	it("skips undefined values and treats a missing before as null", () => {
		expect(diffChanges({}, { tee: undefined, ghin: "123" })).toEqual({
			ghin: { before: null, after: "123" },
		})
	})
})
