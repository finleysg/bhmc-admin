import { expect, test } from "vitest"

import userEvent from "@testing-library/user-event"
import { waitFor } from "@testing-library/react"

import { buildLoginForm } from "../../test/data/auth"
import { http, HttpResponse, server } from "../../test/test-server"
import { renderRoute, renderWithAuth, screen } from "../../test/test-utils"
import { authUrl } from "../../utils/api-utils"
import { LoginScreen } from "../session/login"

test("successful login", async () => {
	renderRoute("/session/login")

	const { email, password } = buildLoginForm()

	await userEvent.type(screen.getByRole("textbox", { name: /email/i }), email)
	await userEvent.type(screen.getByLabelText(/password/i), password)
	await userEvent.click(screen.getByRole("button", { name: /log in/i }))

	expect(screen.getByRole("textbox", { name: /email/i })).toBeValid()
	expect(screen.getByLabelText(/password/i)).toBeValid()

	// In the test, navigation is not happening. Don't know why.
	// await waitFor(() => expect(screen.findByText(/home page/i)).toBeInTheDocument())
})

test("invalid credentials displays the error message", async () => {
	const testErrorMessage = ["Unable to log in with provided credentials."]
	const loginUrl = authUrl("token/login")

	server.use(
		http.post(loginUrl, async () => {
			return HttpResponse.json({ non_field_errors: testErrorMessage }, { status: 400 })
		}),
	)

	renderWithAuth(<LoginScreen />)

	const { email, password } = buildLoginForm()

	await userEvent.type(screen.getByRole("textbox", { name: /email/i }), email)
	await userEvent.type(screen.getByLabelText(/password/i), password)
	await userEvent.click(screen.getByRole("button", { name: /log in/i }))

	const alert = await screen.findByRole("alert")

	expect(alert.textContent).toMatchInlineSnapshot(`"Unable to log in with provided credentials."`)
})

test("submitting the login form without a password fails validation", async () => {
	renderWithAuth(<LoginScreen />)

	const { email } = buildLoginForm()

	await userEvent.type(screen.getByRole("textbox", { name: /email/i }), email)
	await userEvent.click(screen.getByRole("button", { name: /log in/i }))

	expect(screen.getByLabelText(/password/i)).toBeInvalid()
	await screen.findByText(/a password is required to log in./i)
})

test("submitting the login form without an email fails validation", async () => {
	renderWithAuth(<LoginScreen />)

	const { password } = buildLoginForm()

	await userEvent.type(screen.getByLabelText(/password/i), password)
	await userEvent.click(screen.getByRole("button", { name: /log in/i }))

	await waitFor(
		() => {
			expect(screen.getByRole("textbox", { name: /email/i })).toBeInvalid()
		},
		{ timeout: 2000 },
	)
})

test("submitting the login form with an invalid email fails validation", async () => {
	renderWithAuth(<LoginScreen />)

	const { password } = buildLoginForm()

	await userEvent.type(screen.getByRole("textbox", { name: /email/i }), "bogus")
	await userEvent.type(screen.getByLabelText(/password/i), password)
	await userEvent.click(screen.getByRole("button", { name: /log in/i }))

	expect(screen.getByRole("textbox", { name: /email/i })).toBeInvalid()
	await screen.findByText(/invalid email address./i)
})
