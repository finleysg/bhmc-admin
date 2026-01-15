import { expect, test } from "vitest"

import { http, HttpResponse, server } from "../../test/test-server"
import { renderRoute, screen } from "../../test/test-utils"
import { authUrl } from "../../utils/api-utils"

test("successful activation", async () => {
	renderRoute("/session/account/activate/test-uid/test-token")

	expect(screen.getByText(/activating your account/i)).toBeInTheDocument()

	expect(await screen.findByText(/your account is active/i)).toBeVisible()
})

test("failed activation", async () => {
	server.use(
		http.post(authUrl("users/activation/"), () => {
			return HttpResponse.json({ non_field_errors: ["invalid token"] }, { status: 400 })
		}),
	)
	renderRoute("/session/account/activate/test-uid/test-token")

	const alert = await screen.findByRole("alert")

	expect(alert.textContent).toMatchInlineSnapshot(`"invalid token"`)
	expect(screen.getByText(/activation failed/i)).toBeInTheDocument()
})
