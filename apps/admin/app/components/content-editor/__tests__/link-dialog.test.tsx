import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { LinkDialog } from "../link-dialog"

jest.mock("../../ui/modal", () => ({
	Modal: ({
		isOpen,
		children,
		title,
	}: {
		isOpen: boolean
		children: React.ReactNode
		title: string
	}) =>
		isOpen ? (
			<div data-testid="modal" aria-label={title}>
				{children}
			</div>
		) : null,
}))

describe("LinkDialog", () => {
	const defaultProps = {
		isOpen: true,
		onClose: jest.fn(),
		onSubmit: jest.fn(),
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("does not render content when closed", () => {
		render(<LinkDialog {...defaultProps} isOpen={false} />)
		expect(screen.queryByTestId("modal")).not.toBeInTheDocument()
	})

	it("renders URL input when open", () => {
		render(<LinkDialog {...defaultProps} />)
		expect(screen.getByPlaceholderText("https://example.com")).toBeInTheDocument()
	})

	it("Save button disabled when URL is empty", () => {
		render(<LinkDialog {...defaultProps} />)
		expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
	})

	it("Save button enabled after entering a URL", async () => {
		const user = userEvent.setup()
		render(<LinkDialog {...defaultProps} />)
		await user.type(screen.getByPlaceholderText("https://example.com"), "https://test.com")
		expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()
	})

	it("calls onSubmit and onClose on save", async () => {
		const onSubmit = jest.fn()
		const onClose = jest.fn()
		const user = userEvent.setup()

		render(<LinkDialog isOpen={true} onClose={onClose} onSubmit={onSubmit} />)
		await user.type(screen.getByPlaceholderText("https://example.com"), "https://test.com")
		await user.click(screen.getByRole("button", { name: "Save" }))

		expect(onSubmit).toHaveBeenCalledWith("https://test.com")
		expect(onClose).toHaveBeenCalled()
	})

	it("calls onClose on cancel", async () => {
		const onClose = jest.fn()
		const onSubmit = jest.fn()
		const user = userEvent.setup()

		render(<LinkDialog isOpen={true} onClose={onClose} onSubmit={onSubmit} />)
		await user.click(screen.getByRole("button", { name: "Cancel" }))

		expect(onClose).toHaveBeenCalled()
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it("shows Remove button when initialUrl is provided", () => {
		render(<LinkDialog {...defaultProps} initialUrl="https://existing.com" />)
		expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument()
	})

	it("does not show Remove button without initialUrl", () => {
		render(<LinkDialog {...defaultProps} />)
		expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument()
	})

	it("Remove calls onSubmit with empty string and onClose", async () => {
		const onSubmit = jest.fn()
		const onClose = jest.fn()
		const user = userEvent.setup()

		render(
			<LinkDialog
				isOpen={true}
				onClose={onClose}
				onSubmit={onSubmit}
				initialUrl="https://existing.com"
			/>,
		)
		await user.click(screen.getByRole("button", { name: "Remove" }))

		expect(onSubmit).toHaveBeenCalledWith("")
		expect(onClose).toHaveBeenCalled()
	})
})
