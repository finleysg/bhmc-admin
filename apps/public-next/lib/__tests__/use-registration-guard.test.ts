/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react"

import {
	BACK_NAVIGATION,
	useRegistrationGuard,
	isRegistrationFlowUrl,
} from "../registration/use-registration-guard"

// Mock usePathname — default to a registration flow URL so the popstate guard activates
const mockPathname = jest.fn(() => "/event/2026-03-01/weeknight/register")
jest.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
}))

describe("useRegistrationGuard", () => {
	let addSpy: jest.SpyInstance
	let removeSpy: jest.SpyInstance
	let docAddSpy: jest.SpyInstance
	let docRemoveSpy: jest.SpyInstance

	beforeEach(() => {
		addSpy = jest.spyOn(window, "addEventListener")
		removeSpy = jest.spyOn(window, "removeEventListener")
		docAddSpy = jest.spyOn(document, "addEventListener")
		docRemoveSpy = jest.spyOn(document, "removeEventListener")
		mockPathname.mockReturnValue("/event/2026-03-01/weeknight/register")
	})

	afterEach(() => {
		addSpy.mockRestore()
		removeSpy.mockRestore()
		docAddSpy.mockRestore()
		docRemoveSpy.mockRestore()
	})

	describe("beforeunload", () => {
		it("does not add beforeunload listener when active is false", () => {
			renderHook(() => useRegistrationGuard({ active: false }))

			const beforeunloadCalls = addSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "beforeunload")
			expect(beforeunloadCalls).toHaveLength(0)
		})

		it("adds beforeunload listener when active is true", () => {
			renderHook(() => useRegistrationGuard({ active: true }))

			const beforeunloadCalls = addSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "beforeunload")
			expect(beforeunloadCalls).toHaveLength(1)
		})

		it("beforeunload handler calls preventDefault", () => {
			renderHook(() => useRegistrationGuard({ active: true }))

			const call = addSpy.mock.calls.find((c: [string, ...unknown[]]) => c[0] === "beforeunload")
			const handler = call[1]

			const event = new Event("beforeunload")
			const preventDefaultSpy = jest.spyOn(event, "preventDefault")
			handler(event)

			expect(preventDefaultSpy).toHaveBeenCalled()
		})

		it("removes beforeunload listener when active transitions from true to false", () => {
			const { rerender } = renderHook(({ active }) => useRegistrationGuard({ active }), {
				initialProps: { active: true },
			})

			rerender({ active: false })

			const removeCalls = removeSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "beforeunload")
			expect(removeCalls).toHaveLength(1)
		})

		it("cleans up beforeunload listener on unmount", () => {
			const { unmount } = renderHook(() => useRegistrationGuard({ active: true }))

			unmount()

			const removeCalls = removeSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "beforeunload")
			expect(removeCalls).toHaveLength(1)
		})
	})

	describe("in-app navigation", () => {
		it("requestNavigation sets pendingNavigation to the href", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: true }))

			act(() => {
				result.current.requestNavigation("/some/page")
			})

			expect(result.current.pendingNavigation).toBe("/some/page")
		})

		it("requestNavigation is a no-op when active is false", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: false }))

			act(() => {
				result.current.requestNavigation("/some/page")
			})

			expect(result.current.pendingNavigation).toBeNull()
		})

		it("cancelNavigation clears pendingNavigation back to null", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: true }))

			act(() => {
				result.current.requestNavigation("/some/page")
			})
			expect(result.current.pendingNavigation).toBe("/some/page")

			act(() => {
				result.current.cancelNavigation()
			})
			expect(result.current.pendingNavigation).toBeNull()
		})

		it("confirmNavigation clears pendingNavigation and returns the href", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: true }))

			act(() => {
				result.current.requestNavigation("/some/page")
			})

			let href = null
			act(() => {
				href = result.current.confirmNavigation()
			})

			expect(href).toBe("/some/page")
			expect(result.current.pendingNavigation).toBeNull()
		})
	})

	describe("popstate (back/forward button)", () => {
		let pushStateSpy: jest.SpyInstance

		beforeEach(() => {
			pushStateSpy = jest.spyOn(history, "pushState")
		})

		afterEach(() => {
			pushStateSpy.mockRestore()
		})

		it("adds popstate listener and pushes history entry when active on registration flow URL", () => {
			renderHook(() => useRegistrationGuard({ active: true }))

			const popstateCalls = addSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "popstate")
			expect(popstateCalls).toHaveLength(1)
			expect(pushStateSpy).toHaveBeenCalledWith(null, "", location.href)
		})

		it("does not add popstate listener when inactive", () => {
			renderHook(() => useRegistrationGuard({ active: false }))

			const popstateCalls = addSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "popstate")
			expect(popstateCalls).toHaveLength(0)
		})

		it("does not add popstate listener when pathname is not a registration flow URL", () => {
			mockPathname.mockReturnValue("/calendar")
			renderHook(() => useRegistrationGuard({ active: true }))

			const popstateCalls = addSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "popstate")
			expect(popstateCalls).toHaveLength(0)
		})

		it("removes popstate listener on unmount", () => {
			const { unmount } = renderHook(() => useRegistrationGuard({ active: true }))

			unmount()

			const removeCalls = removeSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "popstate")
			expect(removeCalls).toHaveLength(1)
		})

		it("popstate handler does not set pendingNavigation after confirmNavigation", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: true }))

			const call = addSpy.mock.calls.find((c: [string, ...unknown[]]) => c[0] === "popstate")
			const handler = call[1]

			// Simulate: user presses back → dialog shown → user confirms
			act(() => {
				handler(new PopStateEvent("popstate"))
			})
			expect(result.current.pendingNavigation).toBe(BACK_NAVIGATION)

			act(() => {
				result.current.confirmNavigation()
			})
			expect(result.current.pendingNavigation).toBeNull()

			// Simulate Radix AlertDialog onOpenChange race: cancelNavigation fires
			// between confirmNavigation and the popstate triggered by history.back()
			act(() => {
				result.current.cancelNavigation()
			})

			// The history.back() from confirm triggers popstate again — should be ignored
			act(() => {
				handler(new PopStateEvent("popstate"))
			})
			expect(result.current.pendingNavigation).toBeNull()
		})

		it("navigatingRef resets when guard deactivates so a new registration works", () => {
			const { result, rerender } = renderHook(
				({ active }) => useRegistrationGuard({ active }),
				{ initialProps: { active: true } },
			)

			const call = addSpy.mock.calls.find((c: [string, ...unknown[]]) => c[0] === "popstate")
			const handler = call[1]

			// User presses back → confirms navigation
			act(() => {
				handler(new PopStateEvent("popstate"))
			})
			act(() => {
				result.current.confirmNavigation()
			})

			// Guard deactivates (e.g. cancelRegistration completes)
			rerender({ active: false })

			// Re-activate for a new registration
			rerender({ active: true })

			// Find the NEW popstate handler registered after reactivation
			const newCall = addSpy.mock.calls
				.filter((c: [string, ...unknown[]]) => c[0] === "popstate")
				.at(-1)
			const newHandler = newCall![1]

			// Back button should trigger the dialog again (navigatingRef was reset)
			act(() => {
				newHandler(new PopStateEvent("popstate"))
			})
			expect(result.current.pendingNavigation).toBe(BACK_NAVIGATION)
		})

		it("popstate handler sets pendingNavigation to BACK_NAVIGATION and restores URL", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: true }))

			const call = addSpy.mock.calls.find((c: [string, ...unknown[]]) => c[0] === "popstate")
			const handler = call[1]

			pushStateSpy.mockClear()

			act(() => {
				handler(new PopStateEvent("popstate"))
			})

			expect(result.current.pendingNavigation).toBe(BACK_NAVIGATION)
			// Should push current URL back to prevent navigation
			expect(pushStateSpy).toHaveBeenCalledWith(null, "", location.href)
		})
	})

	describe("document click interception", () => {
		it("adds capture-phase click listener on document when active", () => {
			renderHook(() => useRegistrationGuard({ active: true }))

			const clickCalls = docAddSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "click")
			expect(clickCalls).toHaveLength(1)
			expect(clickCalls[0][2]).toBe(true)
		})

		it("does not add click listener when inactive", () => {
			renderHook(() => useRegistrationGuard({ active: false }))

			const clickCalls = docAddSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "click")
			expect(clickCalls).toHaveLength(0)
		})

		it("removes click listener on unmount", () => {
			const { unmount } = renderHook(() => useRegistrationGuard({ active: true }))

			unmount()

			const removeCalls = docRemoveSpy.mock.calls.filter((call: [string, ...unknown[]]) => call[0] === "click")
			expect(removeCalls).toHaveLength(1)
		})

		it("intercepts click on an anchor with non-registration-flow href", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: true }))

			const call = docAddSpy.mock.calls.find((c: [string, ...unknown[]]) => c[0] === "click")
			const handler = call[1]

			const anchor = document.createElement("a")
			anchor.setAttribute("href", "/calendar")
			document.body.appendChild(anchor)

			const event = new MouseEvent("click", { bubbles: true })
			Object.defineProperty(event, "target", { value: anchor })
			const preventSpy = jest.spyOn(event, "preventDefault")

			act(() => {
				handler(event)
			})

			expect(preventSpy).toHaveBeenCalled()
			expect(result.current.pendingNavigation).toBe("/calendar")

			document.body.removeChild(anchor)
		})

		it("does not intercept click on registration flow URL", () => {
			const { result } = renderHook(() => useRegistrationGuard({ active: true }))

			const call = docAddSpy.mock.calls.find((c: [string, ...unknown[]]) => c[0] === "click")
			const handler = call[1]

			const anchor = document.createElement("a")
			anchor.setAttribute("href", "/event/2026-03-01/weeknight/review")
			document.body.appendChild(anchor)

			const event = new MouseEvent("click", { bubbles: true })
			Object.defineProperty(event, "target", { value: anchor })
			const preventSpy = jest.spyOn(event, "preventDefault")

			act(() => {
				handler(event)
			})

			expect(preventSpy).not.toHaveBeenCalled()
			expect(result.current.pendingNavigation).toBeNull()

			document.body.removeChild(anchor)
		})
	})
})

describe("isRegistrationFlowUrl", () => {
	it("returns true for /register under an event path", () => {
		expect(isRegistrationFlowUrl("/event/2026-03-01/weeknight/register")).toBe(true)
	})

	it("returns true for /reserve under an event path", () => {
		expect(isRegistrationFlowUrl("/event/2026-03-01/weeknight/reserve")).toBe(true)
	})

	it("returns true for /review under an event path", () => {
		expect(isRegistrationFlowUrl("/event/2026-03-01/weeknight/review")).toBe(true)
	})

	it("returns true for /payment under an event path", () => {
		expect(isRegistrationFlowUrl("/event/2026-03-01/weeknight/payment")).toBe(true)
	})

	it("returns false for the home page", () => {
		expect(isRegistrationFlowUrl("/")).toBe(false)
	})

	it("returns false for a different event page", () => {
		expect(isRegistrationFlowUrl("/event/2026-04-01/other-event")).toBe(false)
	})

	it("returns false for member pages", () => {
		expect(isRegistrationFlowUrl("/member/profile")).toBe(false)
	})

	it("returns false for null", () => {
		expect(isRegistrationFlowUrl(null)).toBe(false)
	})

	it("returns false for undefined", () => {
		expect(isRegistrationFlowUrl(undefined)).toBe(false)
	})
})
