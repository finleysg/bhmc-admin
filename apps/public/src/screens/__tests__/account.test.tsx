import { expect, test } from "vitest"

import userEvent from "@testing-library/user-event"

import {
	renderWithAuth,
	screen,
	setupAuthenticatedUser,
	waitForLoadingToFinish,
} from "../../test/test-utils"
import { AccountScreen } from "../account/account"

test("can edit profile on the player account screen", async () => {
	const user = userEvent.setup()

	setupAuthenticatedUser()

	renderWithAuth(<AccountScreen />)

	await waitForLoadingToFinish()

	// update player
	await user.click(screen.getByRole("button", { name: /edit/i }))
	await user.clear(screen.getByRole("textbox", { name: /ghin/i }))
	await user.type(screen.getByRole("textbox", { name: /ghin/i }), "1234567")
	await user.click(screen.getByRole("button", { name: /save changes/i }))

	await screen.findByRole("alert") // toast
	expect(screen.getByText("👍 Your account changes have been saved.")).toBeInTheDocument()
})

test.skip("the form is not submitted when it fails validation", async () => {
	const user = userEvent.setup()

	setupAuthenticatedUser()

	renderWithAuth(<AccountScreen />)

	await waitForLoadingToFinish()

	// perform an invalid update
	await user.click(screen.getByRole("button", { name: /edit/i }))
	await user.clear(screen.getByRole("textbox", { name: /email/i }))
	await user.type(screen.getByRole("textbox", { name: /email/i }), "not valid")
	await user.click(screen.getByRole("button", { name: /save/i }))

	await screen.findByText(/please provide a valid email address/i)
})
