import { expect, test, vi } from "vitest"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { EditNotes } from "../edit-notes"

const defaultProps = {
	registrationNotes: "Initial notes",
	signedUpBy: "John Doe",
	onEdit: vi.fn(),
	onCancel: vi.fn(),
}

test("renders correctly with initial notes", () => {
	render(<EditNotes {...defaultProps} />)

	expect(screen.getByText("Edit Registration Notes")).toBeInTheDocument()
	expect(screen.getByText("Registering player: John Doe")).toBeInTheDocument()
	expect(screen.getByLabelText("Notes / Player Requests")).toHaveValue("Initial notes")
	expect(
		screen.getByText("Add any special requests or notes for this player's registration."),
	).toBeInTheDocument()
})

test("renders correctly with null notes", () => {
	render(<EditNotes {...defaultProps} registrationNotes={null} />)

	expect(screen.getByLabelText("Notes / Player Requests")).toHaveValue("")
})

test("renders correctly with empty string notes", () => {
	render(<EditNotes {...defaultProps} registrationNotes="" />)

	expect(screen.getByLabelText("Notes / Player Requests")).toHaveValue("")
})

test("displays the correct player name", () => {
	render(<EditNotes {...defaultProps} signedUpBy="Jane Smith" />)

	expect(screen.getByText("Registering player: Jane Smith")).toBeInTheDocument()
})

test("updates notes value when typing", async () => {
	const user = userEvent.setup()
	render(<EditNotes {...defaultProps} registrationNotes="" />)

	const textarea = screen.getByLabelText("Notes / Player Requests")
	await user.type(textarea, "New notes content")

	expect(textarea).toHaveValue("New notes content")
})

test("replaces existing notes when typing", async () => {
	const user = userEvent.setup()
	render(<EditNotes {...defaultProps} registrationNotes="Old notes" />)

	const textarea = screen.getByLabelText("Notes / Player Requests")
	await user.clear(textarea)
	await user.type(textarea, "Updated notes")

	expect(textarea).toHaveValue("Updated notes")
})

test("calls onCancel and clears notes when cancel button is clicked", async () => {
	const user = userEvent.setup()
	const onCancel = vi.fn()
	render(<EditNotes {...defaultProps} onCancel={onCancel} />)

	// First, modify the notes
	const textarea = screen.getByLabelText("Notes / Player Requests")
	await user.clear(textarea)
	await user.type(textarea, "Modified notes")
	expect(textarea).toHaveValue("Modified notes")

	// Then click cancel
	const cancelButton = screen.getByRole("button", { name: "Cancel editing notes" })
	await user.click(cancelButton)

	expect(onCancel).toHaveBeenCalledOnce()
	expect(textarea).toHaveValue("")
})

test("calls onEdit with current notes and clears field when save button is clicked", async () => {
	const user = userEvent.setup()
	const onEdit = vi.fn()
	render(<EditNotes {...defaultProps} onEdit={onEdit} registrationNotes="" />)

	// Type some notes
	const textarea = screen.getByLabelText("Notes / Player Requests")
	await user.type(textarea, "Final notes")
	expect(textarea).toHaveValue("Final notes")

	// Click save
	const saveButton = screen.getByRole("button", { name: "Save registration notes" })
	await user.click(saveButton)

	expect(onEdit).toHaveBeenCalledWith("Final notes")
	expect(onEdit).toHaveBeenCalledOnce()
	expect(textarea).toHaveValue("")
})

test("calls onEdit with empty string when no notes are entered", async () => {
	const user = userEvent.setup()
	const onEdit = vi.fn()
	render(<EditNotes {...defaultProps} onEdit={onEdit} registrationNotes="" />)

	const saveButton = screen.getByRole("button", { name: "Save registration notes" })
	await user.click(saveButton)

	expect(onEdit).toHaveBeenCalledWith("")
})

test("handles multiple edits correctly", async () => {
	const user = userEvent.setup()
	const onEdit = vi.fn()
	render(<EditNotes {...defaultProps} onEdit={onEdit} registrationNotes="" />)

	const textarea = screen.getByLabelText("Notes / Player Requests")
	const saveButton = screen.getByRole("button", { name: "Save registration notes" })

	// First edit
	await user.type(textarea, "First notes")
	await user.click(saveButton)
	expect(onEdit).toHaveBeenCalledWith("First notes")
	expect(textarea).toHaveValue("")

	// Second edit
	await user.type(textarea, "Second notes")
	await user.click(saveButton)
	expect(onEdit).toHaveBeenCalledWith("Second notes")
	expect(textarea).toHaveValue("")

	expect(onEdit).toHaveBeenCalledTimes(2)
})

test("cancel button resets to empty state after typing", async () => {
	const user = userEvent.setup()
	render(<EditNotes {...defaultProps} registrationNotes="Original notes" />)

	const textarea = screen.getByLabelText("Notes / Player Requests")
	const cancelButton = screen.getByRole("button", { name: "Cancel editing notes" })

	// Modify the notes
	await user.clear(textarea)
	await user.type(textarea, "Some modifications")
	expect(textarea).toHaveValue("Some modifications")

	// Cancel should clear the field
	await user.click(cancelButton)
	expect(textarea).toHaveValue("")
})

test("has proper form structure and accessibility", () => {
	render(<EditNotes {...defaultProps} />)

	const textarea = screen.getByLabelText("Notes / Player Requests")
	expect(textarea).toHaveAttribute("id", "registration-notes")
	expect(textarea).toHaveAttribute("aria-describedby", "notes-help")
	expect(
		screen.getByText("Add any special requests or notes for this player's registration."),
	).toHaveAttribute("id", "notes-help")

	const cancelButton = screen.getByRole("button", { name: "Cancel editing notes" })
	expect(cancelButton).toHaveAttribute("type", "button")
	expect(cancelButton).toHaveAttribute("aria-label", "Cancel editing notes")

	const saveButton = screen.getByRole("button", { name: "Save registration notes" })
	expect(saveButton).toHaveAttribute("type", "button")
	expect(saveButton).toHaveAttribute("aria-label", "Save registration notes")
})

test("textarea has correct attributes", () => {
	render(<EditNotes {...defaultProps} />)

	const textarea = screen.getByLabelText("Notes / Player Requests")
	expect(textarea).toHaveAttribute("name", "notes")
	expect(textarea).toHaveAttribute("rows", "5")
	expect(textarea).toHaveClass("form-control", "fc-alt")
})

test("maintains focus management", async () => {
	const user = userEvent.setup()
	render(<EditNotes {...defaultProps} />)

	const textarea = screen.getByLabelText("Notes / Player Requests")
	const cancelButton = screen.getByRole("button", { name: "Cancel editing notes" })
	const saveButton = screen.getByRole("button", { name: "Save registration notes" })

	// Tab navigation should work properly
	await user.tab()
	expect(textarea).toHaveFocus()

	await user.tab()
	expect(cancelButton).toHaveFocus()

	await user.tab()
	expect(saveButton).toHaveFocus()
})
