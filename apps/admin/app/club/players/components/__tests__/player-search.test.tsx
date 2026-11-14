import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PlayerSearch } from "../player-search"

// Model navigations that are still fetching: the router never commits, so
// window.location and the props keep the last committed URL, and the
// transition stays pending until a test says otherwise.
const replace = jest.fn()
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace }),
	usePathname: () => "/club/players",
}))

let pending = true
jest.mock("react", () => {
	const actual = jest.requireActual<typeof import("react")>("react")
	return { ...actual, useTransition: () => [pending, actual.startTransition] }
})

describe("PlayerSearch", () => {
	beforeEach(() => {
		jest.useFakeTimers()
		replace.mockClear()
		pending = true
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	const setup = (props = { query: "", membersOnly: true }) => {
		const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
		const view = render(<PlayerSearch {...props} />)
		return { user, view }
	}

	it("puts the debounced search in the URL", async () => {
		const { user } = setup()

		await user.type(screen.getByLabelText("Search Players"), "chris")
		act(() => jest.advanceTimersByTime(300))

		expect(replace).toHaveBeenCalledTimes(1)
		expect(replace).toHaveBeenLastCalledWith("/club/players?q=chris")
	})

	it("keeps a pending search when the members filter changes", async () => {
		const { user } = setup()

		await user.type(screen.getByLabelText("Search Players"), "chris")
		act(() => jest.advanceTimersByTime(300))
		await user.click(screen.getByRole("checkbox", { name: "Members only" }))

		expect(replace).toHaveBeenLastCalledWith("/club/players?q=chris&all=1")
	})

	it("keeps a pending filter change when the search fires", async () => {
		const { user } = setup({ query: "chris", membersOnly: true })

		await user.click(screen.getByRole("checkbox", { name: "Members only" }))
		await user.type(screen.getByLabelText("Search Players"), "t")
		act(() => jest.advanceTimersByTime(300))

		expect(replace).toHaveBeenLastCalledWith("/club/players?q=christ&all=1")
	})

	it("clears the search from the URL when the input is emptied", async () => {
		const { user } = setup({ query: "chris", membersOnly: false })

		await user.clear(screen.getByLabelText("Search Players"))
		act(() => jest.advanceTimersByTime(300))

		expect(replace).toHaveBeenLastCalledWith("/club/players?all=1")
	})

	it("adopts a URL change made elsewhere once navigation has settled", async () => {
		const { user, view } = setup({ query: "chris", membersOnly: false })

		// e.g. the Players breadcrumb: the committed URL becomes /club/players.
		pending = false
		view.rerender(<PlayerSearch query="" membersOnly={true} />)
		await user.click(screen.getByRole("checkbox", { name: "Members only" }))

		expect(replace).toHaveBeenLastCalledWith("/club/players?all=1")
	})

	it("shows the new search text after a URL change made elsewhere", () => {
		const { view } = setup({ query: "chris", membersOnly: true })

		pending = false
		view.rerender(<PlayerSearch query="" membersOnly={true} />)

		expect(screen.getByLabelText("Search Players")).toHaveValue("")
	})

	it("keeps text typed while its own search was loading", async () => {
		const { user, view } = setup()
		const input = screen.getByLabelText("Search Players")

		await user.type(input, "chris")
		act(() => jest.advanceTimersByTime(300))
		await user.type(input, "x")
		// The "chris" search commits while "x" is still waiting on the debounce.
		pending = false
		view.rerender(<PlayerSearch query="chris" membersOnly={true} />)

		expect(input).toHaveValue("chrisx")
	})
})
