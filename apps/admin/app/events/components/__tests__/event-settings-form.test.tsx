import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { ClubEvent } from "@repo/domain/types"

import { EventSettingsForm } from "../event-settings-form"

jest.mock("../../../components/content-editor", () => ({
	ContentEditor: () => <div data-testid="content-editor" />,
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }))

const event = {
	id: 7,
	name: "Weeknight Stroke",
	eventType: "N",
	registrationType: "M",
	status: "S",
	startDate: "2027-05-05",
	season: 2027,
	canChoose: true,
	ghinRequired: false,
	starterTimeInterval: 0,
	teamSize: 1,
	ageRestrictionType: "N",
	groupSize: 5,
	signupStart: "2027-04-28T14:00:00.000Z",
} as ClubEvent

describe("EventSettingsForm", () => {
	it("submits the fields of every tab, not just the visible one", async () => {
		const action = jest.fn().mockResolvedValue({ status: "success", message: "Saved" })
		render(<EventSettingsForm event={event} action={action} submitLabel="Save settings" />)

		await userEvent.click(screen.getByRole("button", { name: "Save settings" }))

		await waitFor(() => expect(action).toHaveBeenCalled())
		const formData = (action.mock.calls[0] as [unknown, FormData])[1]
		expect(formData.get("name")).toBe("Weeknight Stroke")
		expect(formData.get("groupSize")).toBe("5")
		expect(formData.get("signupStart")).toBe("2027-04-28T09:00")
		expect(formData.get("status")).toBe("S")
	})

	it("labels the event status, not a slot status", () => {
		render(<EventSettingsForm event={event} action={jest.fn()} submitLabel="Save settings" />)

		expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Scheduled")
	})

	it("opens the first tab with a field error and marks it", async () => {
		const action = jest.fn().mockResolvedValue({
			status: "error",
			message: "Please fix the highlighted fields.",
			fieldErrors: { minimumSignupGroupSize: "Enter a whole number" },
		})
		render(<EventSettingsForm event={event} action={action} submitLabel="Save settings" />)

		await userEvent.click(screen.getByRole("button", { name: "Save settings" }))

		const registration = await screen.findByRole("tab", { name: /Registration/ })
		expect(registration).toHaveAttribute("data-state", "active")
		expect(screen.getByLabelText("has errors")).toBeInTheDocument()
		expect(screen.getByText("Enter a whole number")).toBeVisible()
	})

	it("shows an extra tab's own content and hides the settings Save button there", async () => {
		render(
			<EventSettingsForm
				event={event}
				action={jest.fn()}
				submitLabel="Save settings"
				extraTabs={[{ value: "fees", label: "Fees", content: <p>Fee table</p> }]}
			/>,
		)

		await userEvent.click(screen.getByRole("tab", { name: "Fees" }))

		expect(screen.getByText("Fee table")).toBeVisible()
		expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument()
	})

	it("submits the event to copy from", async () => {
		const action = jest.fn().mockResolvedValue({ status: "idle" })
		render(
			<EventSettingsForm
				event={event}
				action={action}
				submitLabel="Create event"
				copyFromEventId={670}
			/>,
		)

		await userEvent.click(screen.getByRole("button", { name: "Create event" }))

		await waitFor(() => expect(action).toHaveBeenCalled())
		expect((action.mock.calls[0] as [unknown, FormData])[1].get("copyFromEventId")).toBe("670")
	})
})
