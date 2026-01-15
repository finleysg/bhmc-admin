import { expect, test } from "vitest"

import { faker } from "@faker-js/faker"
import userEvent from "@testing-library/user-event"

import { renderRoute, screen } from "../../test/test-utils"

test("successful password reset", async () => {
	renderRoute("/session/reset-password/test-uid/test-token")

	const newPassword = faker.internet.password({ length: 8 })
	const reNewPassword = newPassword

	await userEvent.type(screen.getByLabelText("Password", { exact: true }), newPassword)
	await userEvent.type(screen.getByLabelText(/confirm password/i), reNewPassword)
	await userEvent.click(screen.getByRole("button", { name: /reset password/i }))

	// Navigation to completed screen
	expect(await screen.findByText(/your password has been updated/i)).toBeInTheDocument()
})

test("submitting the login form with mismatched passwords fails validation", async () => {
	renderRoute("/session/reset-password/test-uid/test-token")

	const newPassword = faker.internet.password({ length: 8 })
	const reNewPassword = "not-real"

	await userEvent.type(screen.getByLabelText("Password", { exact: true }), newPassword)
	await userEvent.type(screen.getByLabelText(/confirm password/i), reNewPassword)
	await userEvent.click(screen.getByRole("button", { name: /reset password/i }))

	await screen.findByText(/passwords do not match/i)
})
