import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { EditorToolbar } from "../toolbar"

function createMockEditor(activeMarks: string[] = []) {
	const chainMethods: Record<string, jest.Mock> = {}
	const methodNames = [
		"focus",
		"toggleBold",
		"toggleItalic",
		"toggleHeading",
		"toggleBulletList",
		"toggleOrderedList",
		"toggleBlockquote",
		"setHorizontalRule",
		"clearNodes",
		"unsetAllMarks",
		"run",
	]
	for (const name of methodNames) {
		chainMethods[name] = jest.fn(() => chainMethods)
	}

	return {
		chain: jest.fn(() => chainMethods),
		isActive: jest.fn((type: string) => activeMarks.includes(type)),
		getAttributes: jest.fn(() => ({})),
		_chainMethods: chainMethods,
	}
}

describe("EditorToolbar", () => {
	const defaultProps = {
		isMarkdownMode: false,
		onToggleMode: jest.fn(),
		onLinkClick: jest.fn(),
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("shows formatting buttons in WYSIWYG mode", () => {
		const editor = createMockEditor()
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		render(<EditorToolbar {...defaultProps} editor={editor as any} />)
		expect(screen.getByText("B")).toBeInTheDocument()
		expect(screen.getByText("I")).toBeInTheDocument()
		expect(screen.getByText("H2")).toBeInTheDocument()
		expect(screen.getByText("H3")).toBeInTheDocument()
		expect(screen.getByText("H4")).toBeInTheDocument()
	})

	it("hides formatting buttons in markdown mode", () => {
		const editor = createMockEditor()
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		render(<EditorToolbar {...defaultProps} editor={editor as any} isMarkdownMode={true} />)
		expect(screen.queryByText("B")).not.toBeInTheDocument()
		expect(screen.queryByText("I")).not.toBeInTheDocument()
		expect(screen.queryByText("H2")).not.toBeInTheDocument()
	})

	it("always shows mode toggle buttons", () => {
		const editor = createMockEditor()
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		const { rerender } = render(<EditorToolbar {...defaultProps} editor={editor as any} />)
		const buttons = screen.getAllByRole("button")
		const lastTwo = buttons.slice(-2)
		expect(lastTwo).toHaveLength(2)

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		rerender(<EditorToolbar {...defaultProps} editor={editor as any} isMarkdownMode={true} />)
		const mdButtons = screen.getAllByRole("button")
		expect(mdButtons).toHaveLength(2)
	})

	it("calls onToggleMode when switching to markdown", async () => {
		const user = userEvent.setup()
		const onToggleMode = jest.fn()
		const editor = createMockEditor()

		render(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			<EditorToolbar {...defaultProps} editor={editor as any} onToggleMode={onToggleMode} />,
		)
		const buttons = screen.getAllByRole("button")
		const lastButton = buttons[buttons.length - 1]
		await user.click(lastButton)

		expect(onToggleMode).toHaveBeenCalled()
	})

	it("does not call onToggleMode when clicking active mode", async () => {
		const user = userEvent.setup()
		const onToggleMode = jest.fn()
		const editor = createMockEditor()

		render(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			<EditorToolbar {...defaultProps} editor={editor as any} onToggleMode={onToggleMode} />,
		)
		const buttons = screen.getAllByRole("button")
		const secondToLast = buttons[buttons.length - 2]
		await user.click(secondToLast)

		expect(onToggleMode).not.toHaveBeenCalled()
	})

	it("calls editor commands for bold", async () => {
		const user = userEvent.setup()
		const editor = createMockEditor()

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		render(<EditorToolbar {...defaultProps} editor={editor as any} />)
		await user.click(screen.getByText("B"))

		expect(editor.chain).toHaveBeenCalled()
		expect(editor._chainMethods.focus).toHaveBeenCalled()
		expect(editor._chainMethods.toggleBold).toHaveBeenCalled()
		expect(editor._chainMethods.run).toHaveBeenCalled()
	})

	it("calls onLinkClick for link button", async () => {
		const user = userEvent.setup()
		const onLinkClick = jest.fn()
		const editor = createMockEditor()

		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		render(<EditorToolbar {...defaultProps} editor={editor as any} onLinkClick={onLinkClick} />)
		const linkButton = screen
			.getByText("B")
			.closest(".join")!
			.parentElement!.querySelectorAll(".join")[3]
			.querySelector("button")
		await user.click(linkButton!)

		expect(onLinkClick).toHaveBeenCalled()
	})

	it("reflects active state for bold", () => {
		const editor = createMockEditor(["bold"])
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
		render(<EditorToolbar {...defaultProps} editor={editor as any} />)
		const boldButton = screen.getByText("B").closest("button")!
		expect(boldButton.className).toContain("btn-active")
	})

	it("does not render formatting when editor is null", () => {
		render(<EditorToolbar {...defaultProps} editor={null} />)
		expect(screen.queryByText("B")).not.toBeInTheDocument()
		expect(screen.queryByText("I")).not.toBeInTheDocument()
		expect(screen.getAllByRole("button")).toHaveLength(2)
	})
})
