import { expect, test } from "vitest"

import {
	renderRoute,
	screen,
	setupAnonymousUser,
	setupAuthenticatedUser,
} from "../../../test/test-utils"

test("unauthenticated user redirected to login", async () => {
	setupAnonymousUser()
	const router = renderRoute("/member")

	await screen.findByText(/log in/i)
	expect(router.state.location.pathname).toBe("/session/login")
})

test("authenticated user sees child content", async () => {
	setupAuthenticatedUser()
	renderRoute("/member/account")

	expect(await screen.findByText(/account/i)).toBeVisible()
	expect(screen.getByText(/placeholder for the account page/i)).toBeInTheDocument()
})
