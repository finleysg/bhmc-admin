import { expect, test, vi } from "vitest"

import { render, screen, waitForElementToBeRemoved } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ErrorDisplay } from "../error-display"

test("renders correctly", () => {
	render(<ErrorDisplay error="Test error" />)
	expect(screen.getByText("Test error")).toBeInTheDocument()
	expect(screen.getByRole("alert")).toBeInTheDocument()
})

test("hides after the delay", async () => {
	render(<ErrorDisplay error="Test error" delay={50} />)
	await waitForElementToBeRemoved(screen.getByRole("alert"))
})

test("calls onClose when the close button is clicked", async () => {
	const onClose = vi.fn()
	render(<ErrorDisplay error="Test error" onClose={onClose} />)
	await userEvent.click(screen.getByLabelText("Close"))
	expect(onClose).toHaveBeenCalled()
	expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})
