import { expect, test, vi } from "vitest"

import { ClubEvent, ClubEventApiSchema } from "../../../models/club-event"
import { TestEventType, getTestEvent } from "../../../test/data/test-events"
import {
	renderWithAuth,
	screen,
	setupAuthenticatedUser,
	verifyNeverOccurs,
	waitFor,
} from "../../../test/test-utils"
import { RegisteredButton } from "../registered-button"

test.each([["priority"], ["registration"], ["past"]])(
	"renders the button if sign-ups have started",
	async (registrationWindow) => {
		setupAuthenticatedUser()

		const eventData = getTestEvent(TestEventType.major, registrationWindow)
		const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))

		renderWithAuth(
			<div>
				<RegisteredButton clubEvent={clubEvent} onClick={vi.fn()} />
			</div>,
		)
		await waitFor(() =>
			expect(screen.queryByRole("link", { name: /players/i })).toBeInTheDocument(),
		)
	},
)

test("does not render the button if registration as not started", async () => {
	setupAuthenticatedUser()

	const eventData = getTestEvent(TestEventType.major, "future")
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))

	renderWithAuth(
		<div>
			<RegisteredButton clubEvent={clubEvent} onClick={vi.fn()} />
		</div>,
	)
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("does not render the button if there is no registration", async () => {
	setupAuthenticatedUser()

	const eventData = getTestEvent(TestEventType.deadline, "past")
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))

	renderWithAuth(
		<div>
			<RegisteredButton clubEvent={clubEvent} onClick={vi.fn()} />
		</div>,
	)
	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})
