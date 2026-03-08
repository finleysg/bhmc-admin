import { getSlotsCreatedVariant, getGolfGeniusVariant, getDocumentsVariant } from "../helpers"

describe("getSlotsCreatedVariant", () => {
	it("returns 'success' when totalSpots > 0", () => {
		expect(getSlotsCreatedVariant(10)).toBe("success")
		expect(getSlotsCreatedVariant(1)).toBe("success")
	})

	it("returns 'warning' when totalSpots is 0", () => {
		expect(getSlotsCreatedVariant(0)).toBe("warning")
	})
})

describe("getGolfGeniusVariant", () => {
	it("returns 'success' when ggId is truthy", () => {
		expect(getGolfGeniusVariant("GG-123")).toBe("success")
		expect(getGolfGeniusVariant("abc")).toBe("success")
	})

	it("returns 'warning' when ggId is null", () => {
		expect(getGolfGeniusVariant(null)).toBe("warning")
	})

	it("returns 'warning' when ggId is undefined", () => {
		expect(getGolfGeniusVariant(undefined)).toBe("warning")
	})

	it("returns 'warning' when ggId is empty string", () => {
		expect(getGolfGeniusVariant("")).toBe("warning")
	})
})

describe("getDocumentsVariant", () => {
	it("returns 'success' when documentsCount > 0", () => {
		expect(getDocumentsVariant(5)).toBe("success")
		expect(getDocumentsVariant(1)).toBe("success")
	})

	it("returns 'warning' when documentsCount is 0", () => {
		expect(getDocumentsVariant(0)).toBe("warning")
	})
})
