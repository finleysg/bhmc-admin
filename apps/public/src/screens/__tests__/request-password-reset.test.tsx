import { expect, test } from "vitest"

import { faker } from "@faker-js/faker"
import userEvent from "@testing-library/user-event"

import { renderRoute, screen } from "../../test/test-utils"

test("successful reset request", async () => {
	renderRoute("/session/reset-password")

	const email = faker.internet.email()

	await userEvent.type(screen.getByRole("textbox", { name: /email/i }), email)
	await userEvent.click(screen.getByRole("button", { name: /request password reset/i }))

	expect(await screen.findByText(/password reset email has been sent/i)).toBeInTheDocument()
})

test("submitting the login form without an email fails validation", async () => {
	renderRoute("/session/reset-password")

	await userEvent.click(screen.getByRole("button", { name: /request password reset/i }))

	await screen.findByText(/invalid email/i)
})

test("submitting the login form with an invalid email fails validation", async () => {
	renderRoute("/session/reset-password")

	const email = "not-an-email"

	await userEvent.type(screen.getByRole("textbox", { name: /email/i }), email)
	await userEvent.click(screen.getByRole("button", { name: /request password reset/i }))

	await screen.findByText(/invalid email/i)
})
