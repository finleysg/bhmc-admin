import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

/* ------------------------------------------------------------------ */
/* Mocks                                                               */
/* ------------------------------------------------------------------ */

// Capture the useEditor config so we can invoke onUpdate
let useEditorConfig: Record<string, unknown> | null = null

// Stable chain result so assertions work on the same object
const chainMethods: Record<string, jest.Mock> = {}
for (const m of ["focus", "extendMarkRange", "setLink", "unsetLink", "run"]) {
	chainMethods[m] = jest.fn(() => chainMethods)
}

const mockEditor = {
	commands: { setContent: jest.fn() },
	setEditable: jest.fn(),
	getAttributes: jest.fn(() => ({})),
	isActive: jest.fn(() => false),
	chain: jest.fn(() => chainMethods),
	storage: { markdown: { getMarkdown: jest.fn(() => "# mock markdown") } },
}

let returnNullEditor = false

jest.mock("@tiptap/react", () => ({
	useEditor: (config: Record<string, unknown>) => {
		useEditorConfig = config
		return returnNullEditor ? null : mockEditor
	},
	EditorContent: ({ editor }: { editor: unknown }) =>
		editor ? <div data-testid="editor-content" /> : null,
}))

jest.mock("@tiptap/starter-kit", () => ({ default: {} }))
jest.mock("@tiptap/extension-link", () => {
	const configure = () => ({})
	const Link = { configure }
	return { __esModule: true, default: Link }
})
jest.mock("tiptap-markdown", () => ({ Markdown: {} }))

// Capture child component props
let toolbarProps: Record<string, unknown> = {}
jest.mock("../toolbar", () => ({
	EditorToolbar: (props: Record<string, unknown>) => {
		toolbarProps = props
		return <div data-testid="toolbar" />
	},
}))

let linkDialogProps: Record<string, unknown> = {}
jest.mock("../link-dialog", () => ({
	LinkDialog: (props: Record<string, unknown>) => {
		linkDialogProps = props
		return <div data-testid="link-dialog" />
	},
}))

// Import after mocks
import { ContentEditor } from "../index"

describe("ContentEditor", () => {
	const defaultProps = {
		value: "# Hello",
		onChange: jest.fn(),
	}

	beforeEach(() => {
		jest.clearAllMocks()
		// Reset chain methods
		for (const m of Object.values(chainMethods)) {
			m.mockClear()
			m.mockImplementation(() => chainMethods)
		}
		returnNullEditor = false
		useEditorConfig = null
		toolbarProps = {}
		linkDialogProps = {}
	})

	it("renders null when editor not ready", () => {
		returnNullEditor = true
		const { container } = render(<ContentEditor {...defaultProps} />)
		expect(container.innerHTML).toBe("")
	})

	it("renders editor content in WYSIWYG mode by default", () => {
		render(<ContentEditor {...defaultProps} />)
		expect(screen.getByTestId("editor-content")).toBeInTheDocument()
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
	})

	it("passes initial value to editor", () => {
		render(<ContentEditor {...defaultProps} />)
		expect(mockEditor.commands.setContent).toHaveBeenCalledWith("# Hello")
	})

	it("calls onChange when editor updates", () => {
		const onChange = jest.fn()
		render(<ContentEditor {...defaultProps} onChange={onChange} />)

		const onUpdate = useEditorConfig?.onUpdate as (args: { editor: typeof mockEditor }) => void
		act(() => {
			onUpdate({ editor: mockEditor })
		})

		expect(onChange).toHaveBeenCalledWith("# mock markdown")
	})

	it("switches to markdown mode via toolbar toggle", () => {
		render(<ContentEditor {...defaultProps} />)

		act(() => {
			const onToggleMode = toolbarProps.onToggleMode as () => void
			onToggleMode()
		})

		expect(screen.getByRole("textbox")).toBeInTheDocument()
		expect(screen.queryByTestId("editor-content")).not.toBeInTheDocument()
	})

	it("textarea calls onChange in markdown mode", async () => {
		const user = userEvent.setup()
		const onChange = jest.fn()
		render(<ContentEditor {...defaultProps} onChange={onChange} />)

		act(() => {
			const onToggleMode = toolbarProps.onToggleMode as () => void
			onToggleMode()
		})

		const textarea = screen.getByRole("textbox")
		await user.type(textarea, "x")

		expect(onChange).toHaveBeenCalled()
	})

	it("switches back to WYSIWYG and syncs content", () => {
		render(<ContentEditor {...defaultProps} />)

		act(() => {
			const toggle1 = toolbarProps.onToggleMode as () => void
			toggle1()
		})

		mockEditor.commands.setContent.mockClear()

		act(() => {
			const toggle2 = toolbarProps.onToggleMode as () => void
			toggle2()
		})

		expect(mockEditor.commands.setContent).toHaveBeenCalled()
		expect(screen.getByTestId("editor-content")).toBeInTheDocument()
	})

	it("syncs external value changes", () => {
		const { rerender } = render(<ContentEditor {...defaultProps} />)
		mockEditor.commands.setContent.mockClear()

		rerender(<ContentEditor {...defaultProps} value="# Updated" />)

		expect(mockEditor.commands.setContent).toHaveBeenCalledWith("# Updated")
	})

	it("does not re-set content for internal changes", () => {
		const onChange = jest.fn()
		const { rerender } = render(<ContentEditor {...defaultProps} onChange={onChange} />)

		const onUpdate = useEditorConfig?.onUpdate as (args: { editor: typeof mockEditor }) => void
		act(() => {
			onUpdate({ editor: mockEditor })
		})

		mockEditor.commands.setContent.mockClear()

		rerender(<ContentEditor {...defaultProps} value="# mock markdown" onChange={onChange} />)

		expect(mockEditor.commands.setContent).not.toHaveBeenCalled()
	})

	it("updates editable when disabled prop changes", () => {
		const { rerender } = render(<ContentEditor {...defaultProps} />)
		mockEditor.setEditable.mockClear()

		rerender(<ContentEditor {...defaultProps} disabled={true} />)

		expect(mockEditor.setEditable).toHaveBeenCalledWith(false)
	})

	it("opens link dialog via toolbar callback", () => {
		render(<ContentEditor {...defaultProps} />)
		expect(linkDialogProps.isOpen).toBe(false)

		act(() => {
			const onLinkClick = toolbarProps.onLinkClick as () => void
			onLinkClick()
		})

		expect(linkDialogProps.isOpen).toBe(true)
	})

	it("link submit sets link on editor", () => {
		render(<ContentEditor {...defaultProps} />)

		act(() => {
			const onSubmit = linkDialogProps.onSubmit as (url: string) => void
			onSubmit("https://example.com")
		})

		expect(mockEditor.chain).toHaveBeenCalled()
		expect(chainMethods.focus).toHaveBeenCalled()
		expect(chainMethods.setLink).toHaveBeenCalledWith({ href: "https://example.com" })
	})

	it("link submit with empty string removes link", () => {
		render(<ContentEditor {...defaultProps} />)

		act(() => {
			const onSubmit = linkDialogProps.onSubmit as (url: string) => void
			onSubmit("")
		})

		expect(chainMethods.unsetLink).toHaveBeenCalled()
	})

	it("renders with custom className", () => {
		const { container } = render(<ContentEditor {...defaultProps} className="my-class" />)
		expect(container.firstElementChild!.className).toContain("my-class")
	})

	it("passes placeholder to editor config", () => {
		render(<ContentEditor {...defaultProps} placeholder="Type here..." />)
		const editorProps = useEditorConfig?.editorProps as { attributes: Record<string, string> }
		expect(editorProps.attributes["data-placeholder"]).toBe("Type here...")
	})
})
