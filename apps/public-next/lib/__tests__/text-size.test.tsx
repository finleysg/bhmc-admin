import { act, fireEvent, render, screen } from "@testing-library/react"
import { TextSizeControl } from "../../app/components/text-size-control"
import { applyTextSize, TEXT_SIZE_KEY, TEXT_SIZE_SCRIPT } from "../text-size"

beforeEach(() => {
	localStorage.clear()
	delete document.documentElement.dataset.textSize
})

afterEach(() => jest.restoreAllMocks())

test("restores a valid saved size before rendering and rejects invalid values", () => {
	localStorage.setItem(TEXT_SIZE_KEY, "largest")
	window.eval(TEXT_SIZE_SCRIPT)
	expect(document.documentElement.dataset.textSize).toBe("largest")
	localStorage.setItem(TEXT_SIZE_KEY, "999%")
	window.eval(TEXT_SIZE_SCRIPT)
	expect(document.documentElement.dataset.textSize).toBe("standard")
})

test("applies and persists size, including resetting to standard", () => {
	applyTextSize("larger")
	expect(document.documentElement.dataset.textSize).toBe("larger")
	expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe("larger")
	applyTextSize("standard")
	window.eval(TEXT_SIZE_SCRIPT)
	expect(document.documentElement.dataset.textSize).toBe("standard")
})

test("keeps the control usable when storage is blocked", () => {
	jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
		throw new Error("blocked")
	})
	jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
		throw new Error("blocked")
	})
	expect(() => {
		window.eval(TEXT_SIZE_SCRIPT)
	}).not.toThrow()
	applyTextSize("largest")
	expect(document.documentElement.dataset.textSize).toBe("largest")
	render(<TextSizeControl />)
	expect(screen.getByRole("button", { name: "Text size" })).toBeTruthy()
})

test("supports keyboard selection and updates the page", () => {
	render(<TextSizeControl />)
	fireEvent.keyDown(screen.getByRole("button", { name: "Text size" }), { key: "Enter" })
	fireEvent.click(screen.getByRole("menuitemradio", { name: "Larger (125%)" }))
	expect(document.documentElement.dataset.textSize).toBe("larger")
	expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe("larger")
})

test("synchronizes changes and resets from another tab", async () => {
	render(<TextSizeControl />)
	await act(() =>
		window.dispatchEvent(new StorageEvent("storage", { key: TEXT_SIZE_KEY, newValue: "largest" })),
	)
	expect(document.documentElement.dataset.textSize).toBe("largest")
	await act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })))
	expect(document.documentElement.dataset.textSize).toBe("standard")
})

test("restores the preference when an error response mounts the layout on the client", () => {
	localStorage.setItem(TEXT_SIZE_KEY, "largest")
	render(<TextSizeControl />)
	expect(document.documentElement.dataset.textSize).toBe("largest")
})
