import { expect, test } from "vitest"

import { Announcement } from "../../../models/announcement"
import { AnnouncementVisibility } from "../../../models/codes"
import { newsBuilder } from "../../../test/data/misc"
import {
	renderWithAuth,
	screen,
	setupAnonymousUser,
	setupAuthenticatedUser,
	verifyNeverOccurs,
} from "../../../test/test-utils"
import { AnnouncementCard } from "../announcement-card"

test("renders a card for members only if the user is an authenticated member", async () => {
	const announcement = new Announcement(
		newsBuilder.one({ overrides: { visibility: AnnouncementVisibility.MembersOnly } }),
	)
	setupAuthenticatedUser()

	renderWithAuth(<AnnouncementCard announcement={announcement} />)

	expect(await screen.findByText(announcement.title)).toBeInTheDocument()
})

test.skip("does not render a card for members only if the user is anonymous", async () => {
	const announcement = new Announcement(
		newsBuilder.one({ overrides: { visibility: AnnouncementVisibility.MembersOnly } }),
	)
	setupAnonymousUser()

	renderWithAuth(<AnnouncementCard announcement={announcement} />)

	await verifyNeverOccurs(() => expect(screen.getByText(announcement.title)).toBeVisible(), {
		timeout: 100,
	})
})

test("does render a card for all visitors if the user is anonymous", async () => {
	const announcement = new Announcement(
		newsBuilder.one({ overrides: { visibility: AnnouncementVisibility.All } }),
	)
	setupAnonymousUser()

	renderWithAuth(<AnnouncementCard announcement={announcement} />)

	expect(await screen.findByText(announcement.title)).toBeInTheDocument()
})
