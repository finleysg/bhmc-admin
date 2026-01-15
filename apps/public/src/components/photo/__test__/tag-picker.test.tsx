import { useState } from "react"

import { beforeEach, expect, test } from "vitest"

import userEvent from "@testing-library/user-event"

import { Tag } from "../../../models/tag"
import { renderWithAuth, screen, waitForLoadingToFinish, within } from "../../../test/test-utils"
import { TagPicker } from "../tag-picker"

function TestHarness() {
	const [message, setMessage] = useState("")
	const handleChange = (tags: Tag[]) => {
		setMessage(`onChange: ${tags.map((t) => t.tag).join("|")}`)
	}
	return (
		<div>
			<TagPicker defaultTags={["Tag1"]} onChange={handleChange} />
			<p data-testid="message">{message}</p>
		</div>
	)
}

beforeEach(() => {
	renderWithAuth(<TestHarness />)
})

test("renders default tags", async () => {
	await waitForLoadingToFinish()
	const tags = await screen.getAllByRole("term")
	expect(tags[0]).toHaveTextContent("Tag1")
})

test("tags are removeable", async () => {
	await waitForLoadingToFinish()
	const tags = await screen.getAllByRole("term")
	await userEvent.click(within(tags[0]).getByRole("button"))
	expect(screen.queryAllByRole("term")).toHaveLength(0)
	expect(screen.getByTestId("message")).toHaveTextContent("onChange:")
})

test("tags can be added", async () => {
	await waitForLoadingToFinish()
	await userEvent.selectOptions(screen.getByRole("combobox"), "3")
	expect(screen.getAllByRole("term")).toHaveLength(2)
	expect(screen.getByTestId("message")).toHaveTextContent("onChange: Tag1|Tag3")
})
