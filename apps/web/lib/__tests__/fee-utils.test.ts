// fee-utils.test.ts
import { convertSlotsToPlayerFees } from "../fee-utils"
import type { ValidatedRegistrationSlot, ValidatedEventFee } from "@repo/domain/types"

describe("convertSlotsToPlayerFees", () => {
	it("returns empty array for empty slots", () => {
		const result = convertSlotsToPlayerFees([], [])
		expect(result).toEqual([])
	})

	it("single player, no fees", () => {
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], [])
		expect(result).toEqual([
			{
				playerId: 10,
				playerName: "A B",
				fees: [],
				subtotal: 0,
			},
		])
	})

	it("single player, one fee selected", () => {
		const eventFee: ValidatedEventFee = {
			id: 2,
			eventId: 1,
			amount: 50,
			isRequired: true,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
		}
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [
				{
					id: 100,
					eventFeeId: 2,
					amount: 60,
					isPaid: true,
					registrationSlotId: 1,
					paymentId: 1,
					eventFee: eventFee,
				},
			],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], [eventFee])
		expect(result[0].fees[0]).toMatchObject({
			id: 2,
			eventId: 1,
			isRequired: true,
			displayOrder: 1,
			code: "ENTRY",
			name: "Entry",
			registrationFeeId: 100,
			amount: 60,
			isSelected: true,
			canChange: true,
		})
		expect(result[0].subtotal).toBe(60)
	})

	it("single player, one fee not selected", () => {
		const eventFee: ValidatedEventFee = {
			id: 2,
			eventId: 1,
			amount: 50,
			isRequired: true,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
		}
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [
				{
					id: 100,
					eventFeeId: 2,
					amount: 60,
					isPaid: false,
					registrationSlotId: 1,
					paymentId: 1,
					eventFee: eventFee,
				},
			],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], [eventFee])
		expect(result[0].fees[0].isSelected).toBe(false)
		expect(result[0].subtotal).toBe(0)
	})

	it("multiple fees, mixed selection", () => {
		const eventFees: ValidatedEventFee[] = [
			{
				id: 2,
				eventId: 1,
				amount: 50,
				isRequired: true,
				displayOrder: 1,
				feeTypeId: 1,
				feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
			},
			{
				id: 3,
				eventId: 1,
				amount: 20,
				isRequired: false,
				displayOrder: 2,
				feeTypeId: 2,
				feeType: { id: 2, name: "Other", code: "OTHER", payout: "none", restriction: "none" },
			},
		]
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [
				{
					id: 100,
					eventFeeId: 2,
					amount: 60,
					isPaid: true,
					registrationSlotId: 1,
					paymentId: 1,
					eventFee: eventFees[0],
				},
				{
					id: 101,
					eventFeeId: 3,
					amount: 25,
					isPaid: false,
					registrationSlotId: 1,
					paymentId: 1,
					eventFee: eventFees[1],
				},
			],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], eventFees)
		expect(result[0].fees[0].isSelected).toBe(true)
		expect(result[0].fees[1].isSelected).toBe(false)
		expect(result[0].subtotal).toBe(60)
	})

	it("multiple players, independent fees", () => {
		const eventFee: ValidatedEventFee = {
			id: 2,
			eventId: 1,
			amount: 50,
			isRequired: true,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
		}
		const slotA: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [
				{
					id: 100,
					eventFeeId: 2,
					amount: 60,
					isPaid: true,
					registrationSlotId: 1,
					paymentId: 1,
					eventFee: eventFee,
				},
			],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const slotB: ValidatedRegistrationSlot = {
			id: 2,
			eventId: 1,
			player: {
				id: 11,
				firstName: "C",
				lastName: "D",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 2,
			},
			fees: [],
			status: "P",
			registrationId: 2,
			startingOrder: 2,
			slot: 2,
		}
		const result = convertSlotsToPlayerFees([slotA, slotB], [eventFee])
		expect(result[0].playerId).toBe(10)
		expect(result[0].subtotal).toBe(60)
		expect(result[1].playerId).toBe(11)
		expect(result[1].subtotal).toBe(0)
	})

	it("fee amount as string", () => {
		const eventFee: ValidatedEventFee = {
			id: 2,
			eventId: 1,
			// Testing runtime coercion: database/API may return amount as string
			amount: "50" as unknown as number,
			isRequired: true,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
		}
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], [eventFee])
		expect(result[0].fees[0].amount).toBe(50)
	})

	it("fee with zero amount", () => {
		const eventFee: ValidatedEventFee = {
			id: 2,
			eventId: 1,
			amount: 0,
			isRequired: true,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
		}
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], [eventFee])
		expect(result[0].fees[0].amount).toBe(0)
	})

	it("required and optional fees included", () => {
		const eventFees: ValidatedEventFee[] = [
			{
				id: 2,
				eventId: 1,
				amount: 50,
				isRequired: true,
				displayOrder: 1,
				feeTypeId: 1,
				feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
			},
			{
				id: 3,
				eventId: 1,
				amount: 20,
				isRequired: false,
				displayOrder: 2,
				feeTypeId: 2,
				feeType: { id: 2, name: "Other", code: "OTHER", payout: "none", restriction: "none" },
			},
		]
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], eventFees)
		expect(result[0].fees.length).toBe(2)
		expect(result[0].fees[0].isRequired).toBe(true)
		expect(result[0].fees[1].isRequired).toBe(false)
	})

	it("fee display order preserved", () => {
		const eventFees: ValidatedEventFee[] = [
			{
				id: 2,
				eventId: 1,
				amount: 50,
				isRequired: true,
				displayOrder: 2,
				feeTypeId: 1,
				feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
			},
			{
				id: 3,
				eventId: 1,
				amount: 20,
				isRequired: false,
				displayOrder: 1,
				feeTypeId: 2,
				feeType: { id: 2, name: "Other", code: "OTHER", payout: "none", restriction: "none" },
			},
		]
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], eventFees)
		expect(result[0].fees[0].displayOrder).toBe(2)
		expect(result[0].fees[1].displayOrder).toBe(1)
	})

	it("player name is firstName + lastName", () => {
		const eventFee: ValidatedEventFee = {
			id: 2,
			eventId: 1,
			amount: 50,
			isRequired: true,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
		}
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "Alpha",
				lastName: "Beta",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], [eventFee])
		expect(result[0].playerName).toBe("Alpha Beta")
	})

	it("registrationFeeId set when fee is paid", () => {
		const eventFee: ValidatedEventFee = {
			id: 2,
			eventId: 1,
			amount: 50,
			isRequired: true,
			displayOrder: 1,
			feeTypeId: 1,
			feeType: { id: 1, name: "Entry", code: "ENTRY", payout: "none", restriction: "none" },
		}
		const slot: ValidatedRegistrationSlot = {
			id: 1,
			eventId: 1,
			player: {
				id: 10,
				firstName: "A",
				lastName: "B",
				email: "",
				tee: "",
				isMember: true,
				birthDate: "",
				ghin: "",
				userId: 1,
			},
			fees: [
				{
					id: 100,
					eventFeeId: 2,
					amount: 60,
					isPaid: true,
					registrationSlotId: 1,
					paymentId: 1,
					eventFee: eventFee,
				},
			],
			status: "P",
			registrationId: 1,
			startingOrder: 1,
			slot: 1,
		}
		const result = convertSlotsToPlayerFees([slot], [eventFee])
		expect(result[0].fees[0].registrationFeeId).toBe(100)
	})
})
