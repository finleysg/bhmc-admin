import { expect, test } from "vitest"

import {
	renderWithAuth,
	screen,
	setupAuthenticatedUser,
	waitForLoadingToFinish,
} from "../../../test/test-utils"
import { PlayerInfo } from "../player-info"

test("displays the current player's profile", async () => {
	const userData = setupAuthenticatedUser()

	renderWithAuth(<PlayerInfo />)

	await waitForLoadingToFinish()

	expect(screen.getByText(`${userData.first_name} ${userData.last_name}`)).toBeInTheDocument()
	expect(screen.getByText(userData.email)).toBeInTheDocument()
})
