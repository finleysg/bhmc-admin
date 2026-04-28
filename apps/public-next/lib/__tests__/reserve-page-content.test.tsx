/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

// --- Mocks ---

const mockReplace = jest.fn()
jest.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}))

const mockInvalidateQueries = jest.fn(() => Promise.resolve())
jest.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

const mockToastError = jest.fn()
jest.mock("sonner", () => ({
	toast: {
		error: (msg: string) => {
			mockToastError(msg)
		},
	},
}))

const mockCreateRegistration = jest.fn()
const mockSetError = jest.fn()
jest.mock("../registration/registration-context", () => ({
	useRegistration: () => ({
		createRegistration: mockCreateRegistration,
		sseConnected: false,
		setError: mockSetError,
	}),
}))

jest.mock("../hooks/use-registration-slots", () => ({
	useRegistrationSlots: () => ({ data: [] }),
}))

jest.mock("../event-utils", () => ({
	getEventUrl: () => "/event/2026-06-15/test-event",
	getRegistrationStartTime: () => null,
}))

jest.mock("../registration/reserve-utils", () => ({
	loadReserveTables: () => [
		{ course: { id: 1, name: "East" }, groups: [{ id: "g1", name: "8:00 AM" }] },
	],
	getWaveUnlockTimes: () => [],
}))

// Stub ReserveGrid so we can trigger onReserve directly without the full UI.
jest.mock("../../app/event/[eventDate]/[eventName]/components/reserve-grid", () => ({
	ReserveGrid: ({
		onReserve,
	}: {
		onReserve: (
			course: { id: number; name: string },
			slots: { id: number; playerId: number | null }[],
		) => void
	}) => (
		<button
			data-testid="trigger-reserve"
			onClick={() =>
				onReserve({ id: 1, name: "East" }, [
					{ id: 11, playerId: null } as never,
					{ id: 12, playerId: null } as never,
				])
			}
		>
			Reserve
		</button>
	),
}))

beforeEach(() => {
	jest.clearAllMocks()
})

const event = {
	id: 100,
	name: "Test Event",
} as never // ClubEventDetail

async function importPage() {
	const mod = await import("@/app/event/[eventDate]/[eventName]/reserve/reserve-page-content")
	return mod.ReservePageContent
}

describe("ReservePageContent.handleReserve", () => {
	it("navigates to /register when createRegistration returns a registration with the requested slots", async () => {
		mockCreateRegistration.mockResolvedValue({
			id: 42,
			slots: [{ id: 11 }, { id: 12 }],
		})

		const ReservePageContent = await importPage()
		render(<ReservePageContent event={event} />)
		fireEvent.click(screen.getByTestId("trigger-reserve"))

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith("/event/2026-06-15/test-event/register")
		})
		expect(mockToastError).not.toHaveBeenCalled()
	})

	it("does NOT navigate and shows a toast when createRegistration rejects with a slot conflict", async () => {
		mockCreateRegistration.mockRejectedValue(
			new Error("One or more of the slots you requested have already been reserved"),
		)

		const ReservePageContent = await importPage()
		render(<ReservePageContent event={event} />)
		fireEvent.click(screen.getByTestId("trigger-reserve"))

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalledWith(
				"Those tee times were just reserved by another player. Please choose another tee time.",
			)
		})
		expect(mockReplace).not.toHaveBeenCalled()
		expect(mockInvalidateQueries).toHaveBeenCalledWith({
			queryKey: ["event-registration-slots", 100],
		})
		expect(mockSetError).toHaveBeenCalledWith(null)
	})

	it("does NOT navigate and shows a toast when the returned registration has fewer slots than requested", async () => {
		// Backend partial-success: registration created but only 1 of 2 slots claimed.
		// Without the slot count check the user would land on /register with a broken
		// registration and hit FK errors when trying to add players.
		mockCreateRegistration.mockResolvedValue({
			id: 42,
			slots: [{ id: 11 }],
		})

		const ReservePageContent = await importPage()
		render(<ReservePageContent event={event} />)
		fireEvent.click(screen.getByTestId("trigger-reserve"))

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalled()
		})
		expect(mockReplace).not.toHaveBeenCalled()
	})
})
