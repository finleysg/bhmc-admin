import { RegistrationStatusChoices } from "@repo/domain/types"

import {
	mapToFeesWithEventFeeAndFeeType,
	mapToRegistrationWithCourse,
	mapToSlotsWithPlayerAndHole,
} from "../mappers"

describe("Registration Mappers", () => {
	describe("mapToRegistrationWithCourse", () => {
		it("should map registration with course", () => {
			const mockRow = {
				registration: {
					id: 1,
					expires: "2024-12-31 23:59:59",
					startingHole: 1,
					startingOrder: 1,
					notes: "Test notes",
					courseId: 10,
					eventId: 100,
					signedUpBy: "admin@example.com",
					userId: 5,
					createdDate: "2024-01-01 10:00:00",
					ggId: "gg123",
				},
				course: {
					id: 10,
					name: "Oak Ridge Golf Club",
					numberOfHoles: 18,
					ggId: "course123",
				},
			}

			const result = mapToRegistrationWithCourse(mockRow)

			expect(result).toEqual({
				id: 1,
				expires: "2024-12-31 23:59:59",
				startingHole: 1,
				startingOrder: 1,
				notes: "Test notes",
				courseId: 10,
				eventId: 100,
				signedUpBy: "admin@example.com",
				userId: 5,
				createdDate: "2024-01-01 10:00:00",
				ggId: "gg123",
				course: {
					id: 10,
					name: "Oak Ridge Golf Club",
					numberOfHoles: 18,
					ggId: "course123",
				},
			})
		})

		it("should map registration without course", () => {
			const mockRow = {
				registration: {
					id: 2,
					expires: "2024-12-31 23:59:59",
					startingHole: 1,
					startingOrder: 2,
					notes: null,
					courseId: null,
					eventId: 100,
					signedUpBy: "user@example.com",
					userId: 10,
					createdDate: "2024-01-02 11:00:00",
					ggId: null,
				},
				course: null,
			}

			const result = mapToRegistrationWithCourse(mockRow)

			expect(result).toEqual({
				id: 2,
				expires: "2024-12-31 23:59:59",
				startingHole: 1,
				startingOrder: 2,
				notes: null,
				courseId: null,
				eventId: 100,
				signedUpBy: "user@example.com",
				userId: 10,
				createdDate: "2024-01-02 11:00:00",
				ggId: null,
			})
			expect(result.course).toBeUndefined()
		})
	})

	describe("mapToSlotsWithPlayerAndHole", () => {
		it("should map slots with player and hole", () => {
			const mockRows = [
				{
					slot: {
						id: 1,
						startingOrder: 1,
						slot: 1,
						status: RegistrationStatusChoices.RESERVED,
						eventId: 100,
						holeId: 5,
						playerId: 20,
						registrationId: 1,
						ggId: "slot123",
					},
					player: {
						id: 20,
						firstName: "John",
						lastName: "Doe",
						email: "john@example.com",
						phoneNumber: "555-1234",
						ghin: "12345678",
						tee: "Blue",
						birthDate: "1980-05-15",
						saveLastCard: 1,
						isMember: 1,
						userId: 25,
						ggId: "player123",
					},
					hole: {
						id: 5,
						holeNumber: 1,
						par: 4,
						courseId: 10,
					},
				},
			]

			const result = mapToSlotsWithPlayerAndHole(mockRows)

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				id: 1,
				startingOrder: 1,
				slot: 1,
				status: RegistrationStatusChoices.RESERVED,
				eventId: 100,
				holeId: 5,
				playerId: 20,
				registrationId: 1,
				ggId: "slot123",
				player: {
					id: 20,
					firstName: "John",
					lastName: "Doe",
					email: "john@example.com",
					phoneNumber: "555-1234",
					ghin: "12345678",
					tee: "Blue",
					birthDate: "1980-05-15",
					saveLastCard: 1,
					isMember: 1,
					userId: 25,
					ggId: "player123",
				},
				hole: {
					id: 5,
					holeNumber: 1,
					par: 4,
					courseId: 10,
				},
			})
		})

		it("should map slots without player and hole", () => {
			const mockRows = [
				{
					slot: {
						id: 2,
						startingOrder: 2,
						slot: 2,
						status: RegistrationStatusChoices.AVAILABLE,
						eventId: 100,
						holeId: null,
						playerId: null,
						registrationId: 1,
						ggId: null,
					},
					player: null,
					hole: null,
				},
			]

			const result = mapToSlotsWithPlayerAndHole(mockRows)

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				id: 2,
				startingOrder: 2,
				slot: 2,
				status: RegistrationStatusChoices.AVAILABLE,
				eventId: 100,
				holeId: null,
				playerId: null,
				registrationId: 1,
				ggId: null,
			})
			expect(result[0].player).toBeUndefined()
			expect(result[0].hole).toBeUndefined()
		})

		it("should handle mixed slots (some with data, some without)", () => {
			const mockRows = [
				{
					slot: {
						id: 1,
						startingOrder: 1,
						slot: 1,
						status: RegistrationStatusChoices.RESERVED,
						eventId: 100,
						holeId: 5,
						playerId: 20,
						registrationId: 1,
						ggId: "slot1",
					},
					player: {
						id: 20,
						firstName: "John",
						lastName: "Doe",
						email: "john@example.com",
						phoneNumber: null,
						ghin: "12345678",
						tee: "Blue",
						birthDate: null,
						saveLastCard: 1,
						isMember: 1,
						userId: 25,
						ggId: "player1",
					},
					hole: {
						id: 5,
						holeNumber: 1,
						par: 4,
						courseId: 10,
					},
				},
				{
					slot: {
						id: 2,
						startingOrder: 1,
						slot: 2,
						status: RegistrationStatusChoices.AVAILABLE,
						eventId: 100,
						holeId: null,
						playerId: null,
						registrationId: 1,
						ggId: null,
					},
					player: null,
					hole: null,
				},
			]

			const result = mapToSlotsWithPlayerAndHole(mockRows)

			expect(result).toHaveLength(2)
			expect(result[0].player).toBeDefined()
			expect(result[0].hole).toBeDefined()
			expect(result[1].player).toBeUndefined()
			expect(result[1].hole).toBeUndefined()
		})

		it("should handle empty array", () => {
			const result = mapToSlotsWithPlayerAndHole([])
			expect(result).toEqual([])
		})
	})

	describe("mapToFeesWithEventFeeAndFeeType", () => {
		it("should map fees with eventFee and feeType", () => {
			const mockRows = [
				{
					fee: {
						id: 1,
						isPaid: 1,
						eventFeeId: 10,
						paymentId: 5,
						registrationSlotId: 1,
						amount: 50.0,
					},
					eventFee: {
						id: 10,
						amount: 50.0,
						isRequired: 1,
						displayOrder: 1,
						eventId: 100,
						feeTypeId: 3,
						overrideAmount: null,
						overrideRestriction: null,
					},
					feeType: {
						id: 3,
						name: "Green Fee",
						code: "GRN",
						payout: "none",
						restriction: "all",
					},
				},
			]

			const result = mapToFeesWithEventFeeAndFeeType(mockRows)

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				id: 1,
				isPaid: 1,
				eventFeeId: 10,
				paymentId: 5,
				registrationSlotId: 1,
				amount: 50.0,
				eventFee: {
					id: 10,
					amount: 50.0,
					isRequired: 1,
					displayOrder: 1,
					eventId: 100,
					feeTypeId: 3,
					overrideAmount: null,
					overrideRestriction: null,
					feeType: {
						id: 3,
						name: "Green Fee",
						code: "GRN",
						payout: "none",
						restriction: "all",
					},
				},
			})
		})

		it("should map fees without eventFee", () => {
			const mockRows = [
				{
					fee: {
						id: 2,
						isPaid: 0,
						eventFeeId: 11,
						paymentId: 6,
						registrationSlotId: 2,
						amount: 25.0,
					},
					eventFee: null,
					feeType: null,
				},
			]

			const result = mapToFeesWithEventFeeAndFeeType(mockRows)

			expect(result).toHaveLength(1)
			expect(result[0]).toEqual({
				id: 2,
				isPaid: 0,
				eventFeeId: 11,
				paymentId: 6,
				registrationSlotId: 2,
				amount: 25.0,
			})
			expect(result[0].eventFee).toBeUndefined()
		})

		it("should map fees with eventFee but no feeType", () => {
			const mockRows = [
				{
					fee: {
						id: 3,
						isPaid: 1,
						eventFeeId: 12,
						paymentId: 7,
						registrationSlotId: 3,
						amount: 30.0,
					},
					eventFee: {
						id: 12,
						amount: 30.0,
						isRequired: 0,
						displayOrder: 2,
						eventId: 100,
						feeTypeId: 4,
						overrideAmount: 25.0,
						overrideRestriction: "members",
					},
					feeType: null,
				},
			]

			const result = mapToFeesWithEventFeeAndFeeType(mockRows)

			expect(result).toHaveLength(1)
			expect(result[0].eventFee).toBeDefined()
			expect(result[0].eventFee?.feeType).toBeUndefined()
		})

		it("should handle multiple fees", () => {
			const mockRows = [
				{
					fee: {
						id: 1,
						isPaid: 1,
						eventFeeId: 10,
						paymentId: 5,
						registrationSlotId: 1,
						amount: 50.0,
					},
					eventFee: {
						id: 10,
						amount: 50.0,
						isRequired: 1,
						displayOrder: 1,
						eventId: 100,
						feeTypeId: 3,
						overrideAmount: null,
						overrideRestriction: null,
					},
					feeType: {
						id: 3,
						name: "Green Fee",
						code: "GRN",
						payout: "none",
						restriction: "all",
					},
				},
				{
					fee: {
						id: 2,
						isPaid: 0,
						eventFeeId: 11,
						paymentId: 5,
						registrationSlotId: 1,
						amount: 10.0,
					},
					eventFee: {
						id: 11,
						amount: 10.0,
						isRequired: 0,
						displayOrder: 2,
						eventId: 100,
						feeTypeId: 4,
						overrideAmount: null,
						overrideRestriction: null,
					},
					feeType: {
						id: 4,
						name: "Skins",
						code: "SKN",
						payout: "winner",
						restriction: "all",
					},
				},
			]

			const result = mapToFeesWithEventFeeAndFeeType(mockRows)

			expect(result).toHaveLength(2)
			expect(result[0].eventFee?.feeType?.name).toBe("Green Fee")
			expect(result[1].eventFee?.feeType?.name).toBe("Skins")
		})

		it("should handle empty array", () => {
			const result = mapToFeesWithEventFeeAndFeeType([])
			expect(result).toEqual([])
		})
	})
})
