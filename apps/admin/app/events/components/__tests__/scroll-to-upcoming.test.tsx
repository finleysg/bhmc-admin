import { render, screen } from "@testing-library/react"

import { ScrollToUpcoming } from "../scroll-to-upcoming"

const rect = (top: number) => ({ top }) as DOMRect

describe("ScrollToUpcoming", () => {
	afterEach(() => jest.restoreAllMocks())

	it("scrolls the upcoming row to the top using viewport positions, not offsetTop", () => {
		// In the viewport, the container's top edge is at 100px and the row at 400px.
		jest.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
			this: Element,
		) {
			return rect(this.hasAttribute("data-upcoming") ? 400 : 100)
		})

		render(
			<ScrollToUpcoming className="list">
				{/* A positioned wrapper like the shadcn Table's, which changes the row's offsetParent. */}
				<div style={{ position: "relative" }}>
					<table>
						<tbody>
							<tr>
								<td>Past</td>
							</tr>
							<tr data-upcoming="">
								<td>Next</td>
							</tr>
						</tbody>
					</table>
				</div>
			</ScrollToUpcoming>,
		)

		const container = screen.getByText("Next").closest(".list")!
		expect(container.scrollTop).toBe(300)
	})

	it("leaves the scroll position alone when no row is upcoming", () => {
		render(
			<ScrollToUpcoming className="list">
				<p>All past</p>
			</ScrollToUpcoming>,
		)

		expect(screen.getByText("All past").closest(".list")!.scrollTop).toBe(0)
	})
})
