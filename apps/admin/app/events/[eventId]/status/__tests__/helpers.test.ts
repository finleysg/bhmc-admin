import { StartTypeChoices } from "@repo/domain/types"
import { formatDate, formatDateTime, getStartTypeLabel, START_TYPE_LABELS } from "../helpers"

describe("formatDate", () => {
	it("returns 'Not set' for null", () => {
		expect(formatDate(null)).toBe("Not set")
	})

	it("returns 'Not set' for undefined", () => {
		expect(formatDate(undefined)).toBe("Not set")
	})

	it("formats valid date string", () => {
		const result = formatDate("2024-06-15")
		// The exact format depends on locale, but should contain key parts
		expect(result).toContain("Jun")
		expect(result).toContain("15")
		expect(result).toContain("2024")
	})
})

describe("formatDateTime", () => {
	it("returns 'Not set' for null", () => {
		expect(formatDateTime(null)).toBe("Not set")
	})

	it("returns 'Not set' for undefined", () => {
		expect(formatDateTime(undefined)).toBe("Not set")
	})

	it("formats valid datetime string", () => {
		const result = formatDateTime("2024-06-15 14:30:00")
		expect(result).toContain("Jun")
		expect(result).toContain("15")
		expect(result).toContain("2024")
	})
})

describe("START_TYPE_LABELS", () => {
	it("maps TT to 'Tee Times'", () => {
		expect(START_TYPE_LABELS[StartTypeChoices.TEETIMES]).toBe("Tee Times")
	})

	it("maps SG to 'Shotgun'", () => {
		expect(START_TYPE_LABELS[StartTypeChoices.SHOTGUN]).toBe("Shotgun")
	})

	it("maps NA to 'N/A'", () => {
		expect(START_TYPE_LABELS[StartTypeChoices.NONE]).toBe("N/A")
	})
})

describe("getStartTypeLabel", () => {
	it("returns 'Tee Times' for TT", () => {
		expect(getStartTypeLabel(StartTypeChoices.TEETIMES)).toBe("Tee Times")
	})

	it("returns 'Shotgun' for SG", () => {
		expect(getStartTypeLabel(StartTypeChoices.SHOTGUN)).toBe("Shotgun")
	})

	it("returns 'N/A' for NONE", () => {
		expect(getStartTypeLabel(StartTypeChoices.NONE)).toBe("N/A")
	})

	it("returns 'N/A' for unknown value", () => {
		expect(getStartTypeLabel("UNKNOWN")).toBe("N/A")
	})

	it("returns 'N/A' for null", () => {
		expect(getStartTypeLabel(null)).toBe("N/A")
	})

	it("returns 'N/A' for undefined", () => {
		expect(getStartTypeLabel(undefined)).toBe("N/A")
	})
})
