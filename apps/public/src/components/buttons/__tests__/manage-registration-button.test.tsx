import { expect, test, vi } from "vitest"

import { ClubEvent, ClubEventApiSchema } from "../../../models/club-event"
import { TestEventType, getTestEvent } from "../../../test/data/test-events"
import {
	renderWithAuth,
	screen,
	setupAuthenticatedUser,
	verifyNeverOccurs,
} from "../../../test/test-utils"
import { ManageRegistrationButton } from "../manage-registration-button"

test("renders the button if sign-ups have started and user is registered", async () => {
	setupAuthenticatedUser()

	const eventData = getTestEvent(TestEventType.weeknight, "registration")
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))

	renderWithAuth(
		<div>
			<ManageRegistrationButton clubEvent={clubEvent} hasSignedUp={true} onClick={vi.fn()} />
		</div>,
	)

	await screen.findByRole("button")
})

test("does not render the button if registration as not started", async () => {
	setupAuthenticatedUser()

	const eventData = getTestEvent(TestEventType.weeknight, "registration")
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))

	renderWithAuth(
		<div>
			<ManageRegistrationButton clubEvent={clubEvent} hasSignedUp={false} onClick={vi.fn()} />
		</div>,
	)

	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})

test("does not render the button if there is no registration", async () => {
	setupAuthenticatedUser()

	const eventData = getTestEvent(TestEventType.deadline, "future")
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))

	renderWithAuth(
		<div>
			<ManageRegistrationButton clubEvent={clubEvent} hasSignedUp={true} onClick={vi.fn()} />
		</div>,
	)

	await verifyNeverOccurs(() => expect(screen.getByRole("button")).toBeVisible(), {
		timeout: 100,
	})
})
