import { BadRequestException } from "@nestjs/common"
import { RegistrationStatusChoices } from "@repo/domain/types"

import { PlayerService } from "../services/player.service"
import type { PlayerRow, RegistrationSlotRow } from "../../database"

// =============================================================================
// Test Fixtures
// =============================================================================

const createPlayerRow = (overrides: Partial<PlayerRow> = {}): PlayerRow => ({
	id: 1,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	phoneNumber: null,
	ghin: null,
	tee: "White",
	birthDate: null,
	saveLastCard: 0,
	stripeCustomerId: null,
	profilePictureId: null,
	isMember: 1,
	lastSeason: null,
	ggId: null,
	userId: 10,
	...overrides,
})

const createRegistrationSlotRow = (
	overrides: Partial<RegistrationSlotRow> = {},
): RegistrationSlotRow => ({
	id: 1,
	eventId: 100,
	registrationId: 1,
	playerId: 1,
	holeId: 1,
	startingOrder: 0,
	slot: 0,
	status: RegistrationStatusChoices.RESERVED,
	ggId: null,
	...overrides,
})

// =============================================================================
// Mock Setup
// =============================================================================

const createMockDrizzleService = () => {
	const mockUpdateBuilder = {
		set: jest.fn().mockReturnThis(),
		where: jest.fn().mockResolvedValue(undefined),
	}
	return {
		db: {
			transaction: jest.fn(),
			update: jest.fn().mockReturnValue(mockUpdateBuilder),
		},
	}
}

const createRegistrationRow = (overrides: Partial<any> = {}): any => ({
	id: 1,
	eventId: 100,
	createdDate: "2024-01-01",
	notes: "",
	courseId: null,
	paymentConfirmation: null,
	paymentAmount: null,
	...overrides,
})

const createMockRegistrationRepository = () => ({
	findRegistrationSlotById: jest.fn(),
	findRegisteredPlayers: jest.fn(),
	findPlayerById: jest.fn(),
	findPlayersByText: jest.fn(),
	getPlayers: jest.fn(),
	findMemberPlayers: jest.fn(),
	findPlayerByGhin: jest.fn(),
	findRegistrationIdByEventAndPlayer: jest.fn(),
	findRegistrationWithCourse: jest.fn(),
	findSlotsWithPlayerAndHole: jest.fn(),
	findFeesWithEventFeeAndFeeType: jest.fn(),
	findRegistrationIdsByEventAndPlayerName: jest.fn(),
	updatePlayer: jest.fn(),
	updateRegistrationSlot: jest.fn(),
	findAvailableSlots: jest.fn(),
	findRegistrationById: jest.fn(),
	findSlotsWithStatusByRegistration: jest.fn(),
	updateRegistration: jest.fn(),
})

const createMockPaymentsRepository = () => ({
	findPaymentById: jest.fn(),
})

const createMockEventsService = () => ({
	getCompleteClubEventById: jest.fn(),
})

const createMockBroadcastService = () => ({
	notifyChange: jest.fn(),
})

function createService() {
	const drizzle = createMockDrizzleService()
	const repository = createMockRegistrationRepository()
	const paymentsRepository = createMockPaymentsRepository()
	const eventsService = createMockEventsService()
	const broadcastService = createMockBroadcastService()

	const service = new PlayerService(
		drizzle as any,
		repository as any,
		paymentsRepository as any,
		eventsService as any,
		broadcastService as any,
	)

	return {
		service,
		drizzle,
		repository,
		paymentsRepository,
		eventsService,
		broadcastService,
	}
}

// =============================================================================
// Tests
// =============================================================================

describe("PlayerService.replacePlayer", () => {
	test("throws BadRequestException if slot not found", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockRejectedValue(new Error("Not found"))

		await expect(
			service.replacePlayer(100, {
				slotId: 999,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow(BadRequestException)

		await expect(
			service.replacePlayer(100, {
				slotId: 999,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow("Slot 999 not found")
	})

	test("throws BadRequestException if slot does not belong to event", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(
			createRegistrationSlotRow({ eventId: 200 }),
		)

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow(BadRequestException)

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow("Slot 1 does not belong to event 100")
	})

	test("throws BadRequestException if slot status is not Reserved", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(
			createRegistrationSlotRow({ status: RegistrationStatusChoices.PENDING }),
		)

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow(BadRequestException)

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow("Slot 1 status must be Reserved")
	})

	test("throws BadRequestException if originalPlayerId does not match slot", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(
			createRegistrationSlotRow({ playerId: 5 }),
		)

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow(BadRequestException)

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow("Slot 1 is assigned to player 5, not 1")
	})

	test("throws BadRequestException if replacement already registered for event", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(createRegistrationSlotRow())
		repository.findRegisteredPlayers.mockResolvedValue([createPlayerRow({ id: 2 })])

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow(BadRequestException)

		await expect(
			service.replacePlayer(100, {
				slotId: 1,
				originalPlayerId: 1,
				replacementPlayerId: 2,
			}),
		).rejects.toThrow("Player 2 is already registered for event 100")
	})

	test("returns slotId when all validations pass", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const replacementPlayer = createPlayerRow({ id: 2, firstName: "Jane", lastName: "Smith" })
		const registrationRecord = createRegistrationRow({ id: 10, notes: "" })

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([createPlayerRow({ id: 5 })])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		eventsService.getCompleteClubEventById.mockResolvedValue({ eventFees: [] })

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(drizzle.db)
		})

		const result = await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
		})

		expect(result.slotId).toBe(1)
	})

	test("updates slot.playerId after successful replace", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const replacementPlayer = createPlayerRow({ id: 2, firstName: "Jane", lastName: "Smith" })
		const registrationRecord = createRegistrationRow({ id: 10, notes: "" })

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		eventsService.getCompleteClubEventById.mockResolvedValue({ eventFees: [] })

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(drizzle.db)
		})

		await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
		})

		expect(repository.updateRegistrationSlot).toHaveBeenCalledWith(
			1,
			{ playerId: 2 },
			expect.anything(),
		)
	})

	test("appends replacement audit trail to registration.notes", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const replacementPlayer = createPlayerRow({ id: 2, firstName: "Jane", lastName: "Smith" })
		const registrationRecord = createRegistrationRow({ id: 10, notes: "Previous notes" })

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		eventsService.getCompleteClubEventById.mockResolvedValue({ eventFees: [] })

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(drizzle.db)
		})

		await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
		})

		// Verify the transaction update was called with correct notes
		const mockUpdateBuilder = drizzle.db.update()
		expect(mockUpdateBuilder.set).toHaveBeenCalledWith(
			expect.objectContaining({
				notes: expect.stringContaining("Replaced John Doe with Jane Smith"),
			}),
		)
	})

	test("appends user-provided notes when present", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const replacementPlayer = createPlayerRow({ id: 2, firstName: "Jane", lastName: "Smith" })
		const registrationRecord = createRegistrationRow({ id: 10, notes: "" })

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		eventsService.getCompleteClubEventById.mockResolvedValue({ eventFees: [] })

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(drizzle.db)
		})

		await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
			notes: "Player injured",
		})

		// Verify the transaction update was called with correct notes including user notes
		const mockUpdateBuilder = drizzle.db.update()
		expect(mockUpdateBuilder.set).toHaveBeenCalledWith(
			expect.objectContaining({
				notes: expect.stringContaining("Player injured"),
			}),
		)
	})

	test("same-rate players return greenFeeDifference=0", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const replacementPlayer = createPlayerRow({ id: 2, firstName: "Jane", lastName: "Smith" })
		const registrationRecord = createRegistrationRow({ id: 10, notes: "" })

		const greensFeeType = {
			id: 1,
			name: "Greens Fee",
			code: "GREENS",
			payout: "passthru",
			restriction: "none",
		}

		const eventRecord = {
			id: 100,
			startDate: "2024-06-15",
			eventFees: [
				{
					id: 1,
					eventId: 100,
					amount: 50,
					isRequired: true,
					displayOrder: 1,
					feeTypeId: 1,
					feeType: greensFeeType,
				},
			],
		}

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		eventsService.getCompleteClubEventById.mockResolvedValue(eventRecord)

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(drizzle.db)
		})

		const result = await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
		})

		expect(result.greenFeeDifference).toBe(0)
	})

	test("senior replacing non-senior returns negative difference", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({
			id: 1,
			firstName: "John",
			lastName: "Doe",
			birthDate: "1970-01-01",
		})
		const replacementPlayer = createPlayerRow({
			id: 2,
			firstName: "Jane",
			lastName: "Smith",
			birthDate: "1950-01-01",
		})
		const registrationRecord = createRegistrationRow({ id: 10, notes: "" })

		const greensFeeType = {
			id: 1,
			name: "Greens Fee",
			code: "GREENS",
			payout: "passthru",
			restriction: "none",
		}

		const eventRecord = {
			id: 100,
			startDate: "2024-06-15",
			eventFees: [
				{
					id: 1,
					eventId: 100,
					amount: 50,
					isRequired: true,
					displayOrder: 1,
					feeTypeId: 1,
					feeType: greensFeeType,
					overrideAmount: 40,
					overrideRestriction: "Seniors",
				},
			],
		}

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		eventsService.getCompleteClubEventById.mockResolvedValue(eventRecord)

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(drizzle.db)
		})

		const result = await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
		})

		expect(result.greenFeeDifference).toBe(-10)
	})

	test("non-senior replacing senior returns positive difference", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({
			id: 1,
			firstName: "John",
			lastName: "Doe",
			birthDate: "1950-01-01",
		})
		const replacementPlayer = createPlayerRow({
			id: 2,
			firstName: "Jane",
			lastName: "Smith",
			birthDate: "1970-01-01",
		})
		const registrationRecord = createRegistrationRow({ id: 10, notes: "" })

		const greensFeeType = {
			id: 1,
			name: "Greens Fee",
			code: "GREENS",
			payout: "passthru",
			restriction: "none",
		}

		const eventRecord = {
			id: 100,
			startDate: "2024-06-15",
			eventFees: [
				{
					id: 1,
					eventId: 100,
					amount: 50,
					isRequired: true,
					displayOrder: 1,
					feeTypeId: 1,
					feeType: greensFeeType,
					overrideAmount: 40,
					overrideRestriction: "Seniors",
				},
			],
		}

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		eventsService.getCompleteClubEventById.mockResolvedValue(eventRecord)

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(drizzle.db)
		})

		const result = await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
		})

		expect(result.greenFeeDifference).toBe(10)
	})
})
