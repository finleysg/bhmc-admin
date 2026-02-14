import { slugify } from "../slugify"

describe("slugify", () => {
	it("converts text to lowercase kebab-case", () => {
		expect(slugify("Wednesday Weeknight")).toBe("wednesday-weeknight")
	})

	it("replaces slashes with spaces (then hyphens)", () => {
		expect(slugify("Best Ball/Scramble")).toBe("best-ball-scramble")
	})

	it("collapses multiple spaces into a single hyphen", () => {
		expect(slugify("Two  Man  Best  Ball")).toBe("two-man-best-ball")
	})

	it("removes special characters", () => {
		expect(slugify("Member's Guest (2024)")).toBe("members-guest-2024")
	})

	it("trims leading and trailing whitespace", () => {
		expect(slugify("  trimmed  ")).toBe("trimmed")
	})

	it("returns empty string for empty input", () => {
		expect(slugify("")).toBe("")
	})

	it("handles already-slugified text", () => {
		expect(slugify("already-slugified")).toBe("already-slugified")
	})

	it("handles single word", () => {
		expect(slugify("Major")).toBe("major")
	})

	it("removes consecutive hyphens", () => {
		expect(slugify("one -- two")).toBe("one-two")
	})
})
