import { expect, test, vi } from "vitest"

import userEvent from "@testing-library/user-event"

import { RegistrationMode } from "../../../context/registration-reducer"
import { SkinsType } from "../../../models/codes"
import { RegistrationFee } from "../../../models/registration"
import { buildAdminUser, buildUser } from "../../../test/data/auth"
import {
	cartFee,
	createEmptyPayment,
	createRegistrationSlot,
	eventFee,
	skinFee,
} from "../../../test/data/registration"
import { render, screen, withHtml } from "../../../test/test-utils"
import { RegistrationSlotLineItem } from "../registration-slot-line-item"

test("renders registration slot for default player", () => {
	const user = buildUser()
	const fees = [eventFee(), skinFee(), cartFee()]
	const payment = createEmptyPayment()
	const slot = createRegistrationSlot({
		player: {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			is_member: true,
		},
	})

	render(
		<div>
			<RegistrationSlotLineItem
				slot={slot}
				eventFees={fees}
				existingFees={null}
				payment={payment}
				team={0}
				skinsType={SkinsType.Individual}
				mode="new"
				onRemovePlayer={vi.fn()}
				onToggleFee={vi.fn()}
			/>
		</div>,
	)

	// Player - not removable
	expect(screen.getByText(`${user.first_name} ${user.last_name}`)).toBeInTheDocument()
	expect(screen.queryByRole("button", { name: /(remove)/i })).not.toBeInTheDocument()

	// Three fees, one required
	const checkboxes = screen.getAllByRole("checkbox")

	expect(checkboxes).toHaveLength(3)
	expect(checkboxes[0]).toBeChecked()
	expect(checkboxes[0]).toBeDisabled()
	expect(checkboxes[1]).not.toBeChecked()
	expect(checkboxes[1]).not.toBeDisabled()
	expect(checkboxes[2]).not.toBeChecked()
	expect(checkboxes[2]).not.toBeDisabled()

	// No team number
	expect(screen.queryByText(/team/i)).not.toBeInTheDocument()
})

test("renders registration slot for the non-default player", async () => {
	const user = buildUser()
	const fees = [eventFee(), skinFee(), cartFee()]
	const payment = createEmptyPayment()
	const slot = createRegistrationSlot({
		slot: 1,
		player: {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			is_member: true,
		},
	})
	const removePlayerSpy = vi.fn()

	render(
		<div>
			<RegistrationSlotLineItem
				slot={slot}
				eventFees={fees}
				existingFees={null}
				payment={payment}
				team={0}
				skinsType={SkinsType.Individual}
				mode="new"
				onRemovePlayer={removePlayerSpy}
				onToggleFee={vi.fn()}
			/>
		</div>,
	)

	// Player - removable
	expect(screen.getByText(`${user.first_name} ${user.last_name}`)).toBeInTheDocument()

	const removeButton = screen.getByRole("button", { name: /(remove)/i })
	expect(removeButton).toBeInTheDocument()

	await userEvent.click(removeButton)
	expect(removePlayerSpy).toHaveBeenCalledWith(slot)

	// Three fees, one required
	const checkboxes = screen.getAllByRole("checkbox")

	expect(checkboxes).toHaveLength(3)
	expect(checkboxes[0]).toBeChecked()
	expect(checkboxes[0]).toBeDisabled()
	expect(checkboxes[1]).not.toBeChecked()
	expect(checkboxes[1]).not.toBeDisabled()
	expect(checkboxes[2]).not.toBeChecked()
	expect(checkboxes[2]).not.toBeDisabled()
})

test("renders a team number if provided", () => {
	const user = buildUser()
	const fees = [eventFee(), skinFee(), cartFee()]
	const payment = createEmptyPayment()
	const slot = createRegistrationSlot({
		player: {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			is_member: true,
		},
	})

	render(
		<div>
			<RegistrationSlotLineItem
				slot={slot}
				eventFees={fees}
				existingFees={null}
				payment={payment}
				team={1}
				skinsType={SkinsType.Individual}
				mode="new"
				onRemovePlayer={vi.fn()}
				onToggleFee={vi.fn()}
			/>
		</div>,
	)

	expect(screen.getByText(withHtml("- team 1"))).toBeInTheDocument()
})

test.each([
	[0, 1],
	[2, 2],
])("player in slot %d on team %d can select team skins", async (slotNumber, teamNumber) => {
	const user = buildUser()
	const fees = [eventFee(), skinFee(), cartFee()]
	const payment = createEmptyPayment()
	const slot = createRegistrationSlot({
		slot: slotNumber,
		player: {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			is_member: true,
		},
	})
	const onToggleFee = vi.fn()

	render(
		<div>
			<RegistrationSlotLineItem
				slot={slot}
				eventFees={fees}
				existingFees={null}
				payment={payment}
				team={teamNumber}
				skinsType={SkinsType.Team}
				mode="new"
				onRemovePlayer={vi.fn()}
				onToggleFee={onToggleFee}
			/>
		</div>,
	)

	const checkboxes = screen.getAllByRole("checkbox")

	expect(checkboxes[1]).not.toBeChecked()
	expect(checkboxes[1]).not.toBeDisabled()

	await userEvent.click(checkboxes[1])
	expect(onToggleFee).toHaveBeenCalledTimes(1)
	// expect(onToggleFee).toHaveBeenCalledWith({ action: "add", slot, fee: fees[1] })
})

test.each([
	[1, 1],
	[3, 2],
])("player in slot %d on team %d cannot select team skins", async (slotNumber, teamNumber) => {
	const user = buildUser()
	const fees = [eventFee(), skinFee(), cartFee()]
	const payment = createEmptyPayment()
	const slot = createRegistrationSlot({
		slot: slotNumber,
		player: {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			is_member: true,
		},
	})
	const onToggleFee = vi.fn()

	render(
		<div>
			<RegistrationSlotLineItem
				slot={slot}
				eventFees={fees}
				existingFees={null}
				payment={payment}
				team={teamNumber}
				skinsType={SkinsType.Team}
				mode="new"
				onRemovePlayer={vi.fn()}
				onToggleFee={onToggleFee}
			/>
		</div>,
	)

	const checkboxes = screen.getAllByRole("checkbox")

	expect(checkboxes[1]).not.toBeChecked()
	expect(checkboxes[1]).toBeDisabled()

	await userEvent.click(checkboxes[1])
	expect(onToggleFee).not.toHaveBeenCalled()
})

test("a selected optional fee is rendered as checked and can be removed", async () => {
	const user = buildUser()
	const fees = [eventFee(), skinFee(), cartFee()]
	const payment = createEmptyPayment({
		payment_details: [
			{
				id: 1,
				event_fee: 1,
				payment: 1,
				registration_slot: 1,
			},
			{
				id: 2,
				event_fee: 2,
				payment: 1,
				registration_slot: 1,
			},
		],
	})
	const slot = createRegistrationSlot({
		player: {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			is_member: true,
		},
	})
	const onToggleFee = vi.fn()

	render(
		<div>
			<RegistrationSlotLineItem
				slot={slot}
				eventFees={fees}
				existingFees={null}
				payment={payment}
				skinsType={SkinsType.Individual}
				mode="new"
				team={0}
				onRemovePlayer={vi.fn()}
				onToggleFee={onToggleFee}
			/>
		</div>,
	)

	const checkboxes = screen.getAllByRole("checkbox")

	expect(checkboxes[0]).toBeChecked()
	expect(checkboxes[0]).toBeDisabled()
	expect(checkboxes[1]).toBeChecked()
	expect(checkboxes[1]).not.toBeDisabled()

	await userEvent.click(checkboxes[0])
	expect(onToggleFee).not.toHaveBeenCalled()

	await userEvent.click(checkboxes[1])
	// expect(onToggleFee).toHaveBeenCalledWith({ action: "remove", slot, fee: fees[1] })
	expect(onToggleFee).toHaveBeenCalledTimes(1)
})

test.each([["new", "edit"]])("a paid fee can only be removed when not in edit mode", (mode) => {
	const user = buildAdminUser()
	const fees = [eventFee(), skinFee(), cartFee()]
	const payment = createEmptyPayment()
	const slot = createRegistrationSlot({
		player: {
			id: user.id,
			first_name: user.first_name,
			last_name: user.last_name,
			is_member: true,
		},
	})
	const existingFees = new Map(
		[
			new RegistrationFee({
				id: 1,
				event_fee: 2,
				registration_slot: slot.id,
				payment: 1,
				is_paid: true,
				amount: "100",
			}),
		].map((fee) => [`${fee.registrationSlotId}-${fee.eventFeeId}`, fee]),
	)
	const onToggleFee = vi.fn()

	render(
		<div>
			<RegistrationSlotLineItem
				slot={slot}
				eventFees={fees}
				existingFees={existingFees}
				payment={payment}
				team={0}
				skinsType={SkinsType.Team}
				mode={mode as RegistrationMode}
				onRemovePlayer={vi.fn()}
				onToggleFee={onToggleFee}
			/>
		</div>,
	)

	const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[]

	expect(checkboxes[1]).toBeChecked()
	expect(checkboxes[1].disabled).toEqual(mode !== "edit")
})
