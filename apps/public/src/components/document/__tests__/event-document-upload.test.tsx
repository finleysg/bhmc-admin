import { expect, test, vi } from "vitest"

import { ClubEvent, ClubEventApiSchema } from "../../../models/club-event"
import { TestEventType, getTestEvent } from "../../../test/data/test-events"
import { renderWithAuth, screen } from "../../../test/test-utils"
import { EventDocumentEditor } from "../event-document-editor"

test("renders the document upload form", async () => {
	const eventData = getTestEvent(TestEventType.weeknight, "future")
	const clubEvent = new ClubEvent(ClubEventApiSchema.parse(eventData))

	renderWithAuth(
		<EventDocumentEditor
			clubEvent={clubEvent}
			document={null}
			onComplete={vi.fn}
			onCancel={vi.fn}
		/>,
	)

	expect(await screen.findByRole("heading", { name: /upload document/i })).toBeInTheDocument()
})
