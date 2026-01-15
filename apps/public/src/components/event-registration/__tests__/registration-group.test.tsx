import { expect, test, vi } from "vitest"

import {
	cartFee,
	createEmptyPayment,
	createTestRegistration,
	eventFee,
	skinFee,
} from "../../../test/data/registration"
import { renderWithAuth, screen, within } from "../../../test/test-utils"
import { RegistrationSlotGroup } from "../registration-slot-group"

test("renders registration group", async () => {
	const fees = [eventFee(), skinFee(), cartFee()]
	const registration = createTestRegistration()
	const payment = createEmptyPayment()

	const addFeeSpy = vi.fn()
	const removeFeeSpy = vi.fn()
	const removePlayerSpy = vi.fn()

	renderWithAuth(
		<div>
			<RegistrationSlotGroup
				addFee={addFeeSpy}
				removeFee={removeFeeSpy}
				removePlayer={removePlayerSpy}
				eventFees={fees}
				existingFees={null}
				registration={registration}
				payment={payment}
				layout="horizontal"
				mode="new"
				teamSize={1}
				skinsType="Individual"
			/>
		</div>,
	)

	// Fee headers
	const feeHeaders = screen.getByTestId("event-fee-header")
	expect(within(feeHeaders).getByText(/event fee/i)).toBeInTheDocument()
	expect(within(feeHeaders).getByText(/skins fee/i)).toBeInTheDocument()
	expect(within(feeHeaders).getByText(/cart fee/i)).toBeInTheDocument()

	// Slots
	const slots = screen.getAllByTestId("registration-slot")
	expect(slots).toHaveLength(4)
})
