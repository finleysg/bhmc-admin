import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { SeasonFeeChange } from "@repo/domain/types"

import { changeSeasonFee } from "../../actions"
import { FeeChangeForm } from "../fee-change-form"

jest.mock("../../actions", () => ({ changeSeasonFee: jest.fn() }))
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }))

const change: SeasonFeeChange = {
	season: 2027,
	feeTypeId: 8,
	feeTypeName: "Greens Fee",
	fromAmount: 47,
	toAmount: 48,
	eventType: null,
	applied: false,
	events: [
		{
			eventId: 1,
			eventName: "2 Man Scramble",
			startDate: "2027-04-24",
			eventType: "W",
			changes: [
				{ kind: "amount", eventFeeId: 3 },
				{ kind: "session", eventFeeId: 3, sessionName: "Afternoon Swing" },
			],
			refused: null,
		},
		{
			eventId: 2,
			eventName: "Club Championship",
			startDate: "2027-08-21",
			eventType: "W",
			changes: [{ kind: "amount", eventFeeId: 4 }],
			refused: "Has 3 registrations",
		},
	],
}

describe("FeeChangeForm", () => {
	beforeEach(() => jest.mocked(changeSeasonFee).mockReset())

	it("shows the preview, then applies the previewed change", async () => {
		const user = userEvent.setup()
		jest
			.mocked(changeSeasonFee)
			.mockResolvedValueOnce({ status: "idle", change })
			.mockResolvedValueOnce({
				status: "success",
				message: "Greens Fee changed on 1 event",
				change: { ...change, applied: true },
			})
		render(<FeeChangeForm season={2027} feeTypes={[{ id: 8, name: "Greens Fee" } as never]} />)

		await user.click(screen.getByRole("button", { name: "Preview" }))

		expect(
			await screen.findByText("Greens Fee $47.00 → $48.00", { exact: false }),
		).toBeInTheDocument()
		expect(
			screen.getByText("1 event will change, 1 left unchanged.", { exact: false }),
		).toBeInTheDocument()
		expect(screen.getByText("Fee, Afternoon Swing session")).toBeInTheDocument()
		expect(screen.getByText("Has 3 registrations")).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: "Apply change" }))

		const [, , formData] = jest.mocked(changeSeasonFee).mock.calls[1]
		expect(formData.get("intent")).toBe("apply")
		expect(await screen.findByText("Changed")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Apply change" })).not.toBeInTheDocument()
	})
})
