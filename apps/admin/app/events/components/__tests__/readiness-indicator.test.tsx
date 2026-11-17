import { render, screen } from "@testing-library/react"

import { ReadinessIndicator, readinessLabel } from "../readiness-indicator"

describe("readinessLabel", () => {
	it.each([
		[{ level: "green", blocking: 0, warnings: 0 }, "Ready to open registration"],
		[{ level: "yellow", blocking: 0, warnings: 1 }, "Ready to open registration: 1 warning"],
		[
			{ level: "red", blocking: 2, warnings: 3 },
			"Not ready to open registration: 2 blocking, 3 warnings",
		],
		[{ level: "red", blocking: 1, warnings: 0 }, "Not ready to open registration: 1 blocking"],
	] as const)("describes %j", (counts, label) => {
		expect(readinessLabel(counts)).toBe(label)
	})
})

describe("ReadinessIndicator", () => {
	it("links to the event's findings", () => {
		render(<ReadinessIndicator eventId={7} counts={{ level: "red", blocking: 1, warnings: 0 }} />)
		expect(
			screen.getByRole("link", { name: "Not ready to open registration: 1 blocking" }),
		).toHaveAttribute("href", "/events/7/readiness")
	})
})
