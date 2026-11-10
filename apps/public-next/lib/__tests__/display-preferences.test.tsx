import { render } from "@testing-library/react"
import { DisplayPreferences } from "../../app/components/display-preferences"

jest.mock("next/navigation", () => ({ useServerInsertedHTML: jest.fn() }))

afterEach(() => {
	localStorage.clear()
	jest.restoreAllMocks()
})

test("client mounting restores preferences without rendering a script", () => {
	localStorage.setItem("bhmc-text-size", "largest")
	localStorage.setItem("theme", "dark")
	const error = jest.spyOn(console, "error")
	const { container } = render(<DisplayPreferences />)
	expect(container.querySelector("script")).toBeNull()
	expect(document.documentElement.dataset.textSize).toBe("largest")
	expect(document.documentElement.classList.contains("dark")).toBe(true)
	expect(error).not.toHaveBeenCalled()
})
