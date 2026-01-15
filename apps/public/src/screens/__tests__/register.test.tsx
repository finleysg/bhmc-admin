import { expect, test } from "vitest"

import userEvent from "@testing-library/user-event"

import { buildRegisterForm } from "../../test/data/auth"
import { http, HttpResponse, server } from "../../test/test-server"
import { renderRoute, screen } from "../../test/test-utils"
import { authUrl } from "../../utils/api-utils"

// TODO: why is this test failing?
test.skip("successful registration", async () => {
	renderRoute("/session/account")

	const { first_name, last_name, email, ghin, password, re_password } = buildRegisterForm()

	await userEvent.type(screen.getByLabelText(/first name/i, { exact: true }), first_name)
	await userEvent.type(screen.getByLabelText(/last name/i), last_name)
	await userEvent.type(screen.getByLabelText(/email/i), email)
	await userEvent.type(screen.getByLabelText(/ghin/i), ghin)
	await userEvent.type(screen.getByLabelText("Password", { exact: true }), password)
	await userEvent.type(screen.getByLabelText(/confirm password/i), re_password)

	await userEvent.click(screen.getByRole("button", { name: /create account/i }))

	// from the account activate screen
	expect(screen.getByText(/verification email was sent/i)).toBeInTheDocument()
})

test("duplicate email displays custom message", async () => {
	const registerUrl = authUrl("users")
	server.use(
		http.post(registerUrl, async () => {
			return HttpResponse.json(["user already exists"], { status: 400 })
		}),
	)

	renderRoute("/session/account")

	const { first_name, last_name, email, ghin, password, re_password } = buildRegisterForm()

	await userEvent.type(screen.getByLabelText(/first name/i, { exact: true }), first_name)
	await userEvent.type(screen.getByLabelText(/last name/i), last_name)
	await userEvent.type(screen.getByLabelText(/email/i), email)
	await userEvent.type(screen.getByLabelText(/ghin/i), ghin)
	await userEvent.type(screen.getByLabelText("Password", { exact: true }), password)
	await userEvent.type(screen.getByLabelText(/confirm password/i), re_password)

	await userEvent.click(screen.getByRole("button", { name: /create account/i }))

	const alert = await screen.findByRole("alert")

	expect(alert.textContent).toMatchInlineSnapshot(
		`"We already have an account with that email. Do you need to reset your password?"`,
	)
	expect(screen.getByRole("link", { name: /reset your password/i })).toBeInTheDocument()
})

test("submitting the login form with mismatched passwords fails validation", async () => {
	renderRoute("/session/account")

	const { first_name, last_name, email, ghin, password } = buildRegisterForm()

	await userEvent.type(screen.getByLabelText(/first name/i, { exact: true }), first_name)
	await userEvent.type(screen.getByLabelText(/last name/i), last_name)
	await userEvent.type(screen.getByLabelText(/email/i), email)
	await userEvent.type(screen.getByLabelText(/ghin/i), ghin)
	await userEvent.type(screen.getByLabelText("Password", { exact: true }), password)
	await userEvent.type(screen.getByLabelText(/confirm password/i), "bogusbogus")

	await userEvent.click(screen.getByRole("button", { name: /create account/i }))

	expect(screen.getByLabelText(/confirm password/i)).toBeInvalid()
	await screen.findByText(/the passwords do not match/i)
})

test("all other fields are required on the register form", async () => {
	renderRoute("/session/account")

	await userEvent.click(screen.getByRole("button", { name: /create account/i }))

	await screen.findByText(/you must provide a first name/i)
	await screen.findByText(/you must provide a last name/i)
	await screen.findByText(/a valid email address is required/i)
})
