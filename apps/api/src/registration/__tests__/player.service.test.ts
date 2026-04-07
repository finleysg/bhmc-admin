import { BadRequestException } from "@nestjs/common"
import { ClubEvent, RegistrationStatusChoices, RegistrationTypeChoices } from "@repo/domain/types"

import { EventRegistrationWaveError } from "../errors/registration.errors"

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
	sessionId: null,
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
			select: jest.fn(),
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
	findPlayersByIds: jest.fn(),
})

const createMockPaymentsRepository = () => ({
	findPaymentById: jest.fn(),
})

const createMockEventsService = () => ({
	getCompleteClubEventById: jest.fn(),
	getEventById: jest.fn(),
})

const createMockBroadcastService = () => ({
	notifyChange: jest.fn(),
})

const createMockMailService = () => ({
	sendMoveNotification: jest.fn(),
	sendPlayerReplacementNotification: jest.fn(),
	sendSwapNotification: jest.fn(),
})

const createMockCoursesService = () => ({
	findCourseWithHolesById: jest.fn(),
})

const createMockAuthUserRepository = () => ({
	update: jest.fn(),
})

function createService() {
	const drizzle = createMockDrizzleService()
	const repository = createMockRegistrationRepository()
	const paymentsRepository = createMockPaymentsRepository()
	const eventsService = createMockEventsService()
	const broadcastService = createMockBroadcastService()
	const mailService = createMockMailService()
	const coursesService = createMockCoursesService()
	const authUserRepository = createMockAuthUserRepository()

	const service = new PlayerService(
		drizzle as any,
		repository as any,
		paymentsRepository as any,
		eventsService as any,
		broadcastService as any,
		mailService as any,
		coursesService as any,
		authUserRepository as any,
	)

	return {
		service,
		drizzle,
		repository,
		paymentsRepository,
		eventsService,
		broadcastService,
		mailService,
		coursesService,
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
		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([createPlayerRow({ id: 5 })])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
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

		repository.findRegistrationSlotById.mockResolvedValue(slotRow)
		repository.findRegisteredPlayers.mockResolvedValue([])
		repository.findPlayerById
			.mockResolvedValueOnce(originalPlayer)
			.mockResolvedValueOnce(replacementPlayer)
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

	test("same-rate players return greenFeeDifference=0", async () => {
		const { service, repository, drizzle, eventsService } = createService()

		const slotRow = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const originalPlayer = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const replacementPlayer = createPlayerRow({ id: 2, firstName: "Jane", lastName: "Smith" })
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

describe("PlayerService.swapPlayers", () => {
	test("throws BadRequestException if slotA not found", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockRejectedValue(new Error("Not found"))

		await expect(
			service.swapPlayers(100, {
				slotAId: 999,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 999 not found")
	})

	test("throws BadRequestException if slotB not found", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 1 }))
			.mockRejectedValueOnce(new Error("Not found"))

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 999,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 999 not found")
	})

	test("throws BadRequestException if slotA does not belong to event", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(
			createRegistrationSlotRow({ id: 1, eventId: 200 }),
		)

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 1 does not belong to event 100")
	})

	test("throws BadRequestException if slotB does not belong to event", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 1, eventId: 100 }))
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 2, eventId: 200 }))

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 2 does not belong to event 100")
	})

	test("throws BadRequestException if slotA status is not RESERVED", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(
			createRegistrationSlotRow({ id: 1, status: RegistrationStatusChoices.PENDING }),
		)

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 1 must have status Reserved")
	})

	test("throws BadRequestException if slotB status is not RESERVED", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 1 }))
			.mockResolvedValueOnce(
				createRegistrationSlotRow({ id: 2, status: RegistrationStatusChoices.PENDING }),
			)

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 2 must have status Reserved")
	})

	test("throws BadRequestException if playerAId does not match slotA.playerId", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(
			createRegistrationSlotRow({ id: 1, playerId: 5 }),
		)

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 1 is assigned to player 5, not 1")
	})

	test("throws BadRequestException if playerBId does not match slotB.playerId", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 1, playerId: 1 }))
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 2, playerId: 5 }))

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Slot 2 is assigned to player 5, not 3")
	})

	test("throws BadRequestException if swapping same player", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(
			createRegistrationSlotRow({ id: 1, playerId: 1 }),
		)

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 1,
			}),
		).rejects.toThrow("Cannot swap a player with themselves")
	})

	test("throws BadRequestException if slots belong to same registration", async () => {
		const { service, repository } = createService()

		repository.findRegistrationSlotById
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 }))
			.mockResolvedValueOnce(createRegistrationSlotRow({ id: 2, playerId: 3, registrationId: 10 }))

		await expect(
			service.swapPlayers(100, {
				slotAId: 1,
				playerAId: 1,
				slotBId: 2,
				playerBId: 3,
			}),
		).rejects.toThrow("Cannot swap players within the same registration")
	})

	test("successful swap: players exchanged correctly", async () => {
		const { service, repository, drizzle } = createService()

		const slotA = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const slotB = createRegistrationSlotRow({ id: 2, playerId: 3, registrationId: 20 })
		const playerA = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const playerB = createPlayerRow({ id: 3, firstName: "Jane", lastName: "Smith" })
		repository.findRegistrationSlotById.mockResolvedValueOnce(slotA).mockResolvedValueOnce(slotB)
		repository.findPlayerById.mockResolvedValueOnce(playerA).mockResolvedValueOnce(playerB)

		const mockTx = {
			select: jest.fn().mockReturnValue({
				from: jest.fn().mockReturnValue({
					where: jest.fn().mockResolvedValue([]),
				}),
			}),
			update: jest.fn().mockReturnValue({
				set: jest.fn().mockReturnValue({
					where: jest.fn().mockResolvedValue(undefined),
				}),
			}),
		}

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(mockTx)
		})

		const result = await service.swapPlayers(100, {
			slotAId: 1,
			playerAId: 1,
			slotBId: 2,
			playerBId: 3,
		})

		expect(result.swappedCount).toBe(2)
		expect(result.playerAName).toBe("John Doe")
		expect(result.playerBName).toBe("Jane Smith")
	})

	test("successful swap: fees moved with players", async () => {
		const { service, repository, drizzle } = createService()

		const slotA = createRegistrationSlotRow({ id: 1, playerId: 1, registrationId: 10 })
		const slotB = createRegistrationSlotRow({ id: 2, playerId: 3, registrationId: 20 })
		const playerA = createPlayerRow({ id: 1, firstName: "John", lastName: "Doe" })
		const playerB = createPlayerRow({ id: 3, firstName: "Jane", lastName: "Smith" })
		const feesA = [{ id: 101, registrationSlotId: 1 }]
		const feesB = [{ id: 102, registrationSlotId: 2 }]

		repository.findRegistrationSlotById.mockResolvedValueOnce(slotA).mockResolvedValueOnce(slotB)
		repository.findPlayerById.mockResolvedValueOnce(playerA).mockResolvedValueOnce(playerB)

		const mockUpdate = jest.fn().mockReturnValue({
			set: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue(undefined),
			}),
		})

		const mockTx = {
			select: jest
				.fn()
				.mockReturnValueOnce({
					from: jest.fn().mockReturnValue({
						where: jest.fn().mockResolvedValue(feesA),
					}),
				})
				.mockReturnValueOnce({
					from: jest.fn().mockReturnValue({
						where: jest.fn().mockResolvedValue(feesB),
					}),
				}),
			update: mockUpdate,
		}

		drizzle.db.transaction.mockImplementation(async (callback: any) => {
			return await callback(mockTx)
		})

		await service.swapPlayers(100, {
			slotAId: 1,
			playerAId: 1,
			slotBId: 2,
			playerBId: 3,
		})

		// Verify fees were reassigned
		expect(mockUpdate).toHaveBeenCalled()
	})
})

describe("PlayerService.updateNotes", () => {
	test("throws NotFoundException if registration not found", async () => {
		const { service, repository } = createService()

		repository.findRegistrationById.mockResolvedValue(null)

		await expect(service.updateNotes(999, "Some notes")).rejects.toThrow(
			"Registration 999 not found",
		)
	})

	test("successfully updates notes with new value", async () => {
		const { service, repository } = createService()

		const registrationRecord = createRegistrationRow({ id: 10, notes: "Old notes" })
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		repository.updateRegistration.mockResolvedValue(registrationRecord)

		await service.updateNotes(10, "New notes")

		expect(repository.updateRegistration).toHaveBeenCalledWith(10, { notes: "New notes" })
	})

	test("handles null (clearing notes)", async () => {
		const { service, repository } = createService()

		const registrationRecord = createRegistrationRow({ id: 10, notes: "Old notes" })
		repository.findRegistrationById.mockResolvedValue(registrationRecord)
		repository.updateRegistration.mockResolvedValue(registrationRecord)

		await service.updateNotes(10, null)

		expect(repository.updateRegistration).toHaveBeenCalledWith(10, { notes: null })
	})
})

describe("PlayerService.searchPlayers", () => {
	test("returns all players when isMember is undefined", async () => {
		const { service, repository } = createService()

		const member = createPlayerRow({ id: 1, isMember: 1 })
		const nonMember = createPlayerRow({ id: 2, isMember: 0 })
		repository.findPlayersByText.mockResolvedValue([member, nonMember])

		const result = await service.searchPlayers({ searchText: "test" })

		expect(result).toHaveLength(2)
	})

	test("returns only members when isMember is true", async () => {
		const { service, repository } = createService()

		const member = createPlayerRow({ id: 1, isMember: 1 })
		const nonMember = createPlayerRow({ id: 2, isMember: 0 })
		repository.findPlayersByText.mockResolvedValue([member, nonMember])

		const result = await service.searchPlayers({ searchText: "test", isMember: true })

		expect(result).toHaveLength(1)
		expect(result[0].id).toBe(1)
	})

	test("returns only non-members when isMember is false", async () => {
		const { service, repository } = createService()

		const member = createPlayerRow({ id: 1, isMember: 1 })
		const nonMember = createPlayerRow({ id: 2, isMember: 0 })
		repository.findPlayersByText.mockResolvedValue([member, nonMember])

		const result = await service.searchPlayers({ searchText: "test", isMember: false })

		expect(result).toHaveLength(1)
		expect(result[0].id).toBe(2)
	})

	test("excludeRegistered filters out registered players", async () => {
		const { service, repository } = createService()

		const player1 = createPlayerRow({ id: 1 })
		const player2 = createPlayerRow({ id: 2 })
		repository.findPlayersByText.mockResolvedValue([player1, player2])
		repository.findRegisteredPlayers.mockResolvedValue([{ id: 1 }])

		const result = await service.searchPlayers({
			searchText: "test",
			eventId: 100,
			excludeRegistered: true,
		})

		expect(result).toHaveLength(1)
		expect(result[0].id).toBe(2)
	})

	test("excludeRegistered=false returns all players", async () => {
		const { service, repository } = createService()

		const player1 = createPlayerRow({ id: 1 })
		const player2 = createPlayerRow({ id: 2 })
		repository.findPlayersByText.mockResolvedValue([player1, player2])

		const result = await service.searchPlayers({
			searchText: "test",
			eventId: 100,
			excludeRegistered: false,
		})

		expect(result).toHaveLength(2)
		expect(repository.findRegisteredPlayers).not.toHaveBeenCalled()
	})
})

// =============================================================================
// Wave Validation Helpers
// =============================================================================

function createClubEvent(overrides: Partial<ClubEvent> = {}): ClubEvent {
	return {
		id: 100,
		eventType: "N",
		name: "Test Event",
		registrationType: RegistrationTypeChoices.MEMBER,
		canChoose: true,
		ghinRequired: false,
		startDate: "2025-06-15",
		status: "S",
		season: 2025,
		starterTimeInterval: 10,
		teamSize: 4,
		ageRestrictionType: "N",
		...overrides,
	}
}

/** Create an event in priority window with waves. Wave duration = 30min each. */
function createPriorityWaveEvent(signupWaves: number, totalGroups: number): ClubEvent {
	const now = Date.now()
	// Priority started 10 minutes ago, signup starts in 80 minutes (3 waves × 30min = 90min total)
	const priorityStart = new Date(now - 10 * 60 * 1000).toISOString()
	const signupStart = new Date(now + (signupWaves * 30 - 10) * 60 * 1000).toISOString()
	const signupEnd = new Date(now + 24 * 60 * 60 * 1000).toISOString()
	return createClubEvent({
		signupWaves,
		totalGroups,
		prioritySignupStart: priorityStart,
		signupStart,
		signupEnd,
	})
}

// =============================================================================
// movePlayers Wave Validation
// =============================================================================

describe("PlayerService.movePlayers wave validation", () => {
	function setupMoveTest(event: ClubEvent) {
		const { service, drizzle, repository, eventsService, broadcastService } = createService()

		eventsService.getEventById.mockResolvedValue(event)

		// Source slots: 2 reserved slots
		const sourceSlot1 = createRegistrationSlotRow({
			id: 101,
			eventId: 100,
			registrationId: 1,
			playerId: 1,
			holeId: 10,
			startingOrder: 0,
		})
		const sourceSlot2 = createRegistrationSlotRow({
			id: 102,
			eventId: 100,
			registrationId: 1,
			playerId: 2,
			holeId: 10,
			startingOrder: 0,
			slot: 1,
		})
		repository.findRegistrationSlotById
			.mockResolvedValueOnce(sourceSlot1)
			.mockResolvedValueOnce(sourceSlot2)
		repository.findRegistrationById.mockResolvedValue(createRegistrationRow({ courseId: 1 }))
		repository.findPlayersByIds.mockResolvedValue([
			createPlayerRow({ id: 1 }),
			createPlayerRow({ id: 2, firstName: "Jane" }),
		])

		// Destination hole
		drizzle.db.select = jest.fn().mockReturnValue({
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockReturnValue({
					limit: jest.fn().mockResolvedValue([{ id: 200, courseId: 1, holeNumber: 9, par: 4 }]),
				}),
			}),
		})

		// Available destination slots
		const destSlotQuery = {
			from: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue([
					{ id: 201, eventId: 100, holeId: 200, startingOrder: 4, slot: 0, status: "A" },
					{ id: 202, eventId: 100, holeId: 200, startingOrder: 4, slot: 1, status: "A" },
				]),
			}),
		}

		// Chain: first call is hole lookup, second is available slots
		let callCount = 0
		drizzle.db.select = jest.fn().mockImplementation(() => {
			callCount++
			if (callCount === 1) {
				return {
					from: jest.fn().mockReturnValue({
						where: jest.fn().mockReturnValue({
							limit: jest.fn().mockResolvedValue([{ id: 200, courseId: 1, holeNumber: 9, par: 4 }]),
						}),
					}),
				}
			}
			return destSlotQuery
		})

		drizzle.db.transaction.mockImplementation((fn: any) => fn(drizzle.db))
		broadcastService.notifyChange.mockReturnValue(undefined)

		return { service, eventsService }
	}

	test("rejects move to wave-locked slot during priority window", async () => {
		// 3 waves, 12 total groups. With 10min elapsed out of 90min, current wave = 1.
		// Destination startingOrder=4 with 12 groups / 3 waves => wave 2.
		const event = createPriorityWaveEvent(3, 12)
		const { service } = setupMoveTest(event)

		await expect(
			service.movePlayers(100, {
				sourceSlotIds: [101, 102],
				destinationStartingHoleId: 200,
				destinationStartingOrder: 4,
			}),
		).rejects.toThrow(EventRegistrationWaveError)
	})

	test("allows move to current-wave slot during priority window", async () => {
		// 3 waves, 12 groups. startingOrder=0 => wave 1, which is current.
		const event = createPriorityWaveEvent(3, 12)
		const { service } = setupMoveTest(event)

		await expect(
			service.movePlayers(100, {
				sourceSlotIds: [101, 102],
				destinationStartingHoleId: 200,
				destinationStartingOrder: 0,
			}),
		).resolves.toEqual({ movedCount: 2 })
	})

	test("allows move during normal registration window", async () => {
		const now = Date.now()
		const event = createClubEvent({
			signupWaves: 3,
			totalGroups: 12,
			prioritySignupStart: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
			signupStart: new Date(now - 60 * 60 * 1000).toISOString(),
			signupEnd: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
		})
		const { service } = setupMoveTest(event)

		await expect(
			service.movePlayers(100, {
				sourceSlotIds: [101, 102],
				destinationStartingHoleId: 200,
				destinationStartingOrder: 4,
			}),
		).resolves.toEqual({ movedCount: 2 })
	})

	test("cross-course move copies signedUpBy and userId to new registration", async () => {
		const event = createClubEvent({
			signupWaves: null,
			totalGroups: 12,
			signupStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
			signupEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
		})
		const { service, drizzle, repository, eventsService, broadcastService } = createService()

		eventsService.getEventById.mockResolvedValue(event)

		const sourceSlot = createRegistrationSlotRow({
			id: 101,
			eventId: 100,
			registrationId: 1,
			playerId: 1,
			holeId: 10,
			startingOrder: 0,
		})
		repository.findRegistrationSlotById.mockResolvedValueOnce(sourceSlot)
		repository.findRegistrationById.mockResolvedValue(
			createRegistrationRow({
				id: 1,
				courseId: 1,
				signedUpBy: "John Doe",
				userId: 42,
			}),
		)
		repository.findPlayersByIds.mockResolvedValue([createPlayerRow({ id: 1 })])

		// Destination hole on a DIFFERENT course (courseId: 2)
		let selectCallCount = 0
		drizzle.db.select = jest.fn().mockImplementation(() => {
			selectCallCount++
			if (selectCallCount === 1) {
				return {
					from: jest.fn().mockReturnValue({
						where: jest.fn().mockReturnValue({
							limit: jest.fn().mockResolvedValue([{ id: 200, courseId: 2, holeNumber: 9, par: 4 }]),
						}),
					}),
				}
			}
			return {
				from: jest.fn().mockReturnValue({
					where: jest
						.fn()
						.mockResolvedValue([
							{ id: 201, eventId: 100, holeId: 200, startingOrder: 0, slot: 0, status: "A" },
						]),
				}),
			}
		})

		const insertValues = jest.fn().mockResolvedValue([{ insertId: 99 }])
		const mockInsert = jest.fn().mockReturnValue({ values: insertValues })
		const mockUpdate = jest.fn().mockReturnValue({
			set: jest.fn().mockReturnValue({
				where: jest.fn().mockResolvedValue(undefined),
			}),
		})

		drizzle.db.transaction.mockImplementation((fn: any) => {
			return fn({ insert: mockInsert, update: mockUpdate })
		})
		broadcastService.notifyChange.mockReturnValue(undefined)

		await service.movePlayers(100, {
			sourceSlotIds: [101],
			destinationStartingHoleId: 200,
			destinationStartingOrder: 0,
		})

		expect(insertValues).toHaveBeenCalledWith(
			expect.objectContaining({
				signedUpBy: "John Doe",
				userId: 42,
			}),
		)
	})

	test("allows move when event has no waves", async () => {
		const event = createClubEvent({
			signupWaves: null,
			totalGroups: 12,
			signupStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
			signupEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
		})
		const { service } = setupMoveTest(event)

		await expect(
			service.movePlayers(100, {
				sourceSlotIds: [101, 102],
				destinationStartingHoleId: 200,
				destinationStartingOrder: 4,
			}),
		).resolves.toEqual({ movedCount: 2 })
	})
})

// =============================================================================
// getAvailableSlots Wave Filtering
// =============================================================================

describe("PlayerService.getAvailableSlots wave filtering", () => {
	function setupAvailableSlotsTest(event: ClubEvent) {
		const { service, repository, eventsService } = createService()

		eventsService.getEventById.mockResolvedValue(event)

		// Slot rows spanning 3 waves: startingOrder 0-3 (wave 1), 4-7 (wave 2), 8-11 (wave 3)
		const slotRows = [
			{
				slot: createRegistrationSlotRow({
					id: 1,
					holeId: 10,
					startingOrder: 0,
					status: "A" as any,
				}),
				hole: { id: 10, holeNumber: 1, par: 4, courseId: 1 },
			},
			{
				slot: createRegistrationSlotRow({
					id: 2,
					holeId: 10,
					startingOrder: 4,
					status: "A" as any,
				}),
				hole: { id: 10, holeNumber: 1, par: 4, courseId: 1 },
			},
			{
				slot: createRegistrationSlotRow({
					id: 3,
					holeId: 10,
					startingOrder: 8,
					status: "A" as any,
				}),
				hole: { id: 10, holeNumber: 1, par: 4, courseId: 1 },
			},
		]
		repository.findAvailableSlots.mockResolvedValue(slotRows)

		return { service }
	}

	test("filters out wave-locked slot groups during priority window", async () => {
		// 3 waves, 12 groups. 10min in => wave 1. Only startingOrder 0-3 should be available.
		const event = createPriorityWaveEvent(3, 12)
		const { service } = setupAvailableSlotsTest(event)

		const result = await service.getAvailableSlots(100, 1, 1)

		expect(result).toHaveLength(1)
		expect(result[0].startingOrder).toBe(0)
	})

	test("returns all slot groups during normal registration", async () => {
		const now = Date.now()
		const event = createClubEvent({
			signupWaves: 3,
			totalGroups: 12,
			prioritySignupStart: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
			signupStart: new Date(now - 60 * 60 * 1000).toISOString(),
			signupEnd: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
		})
		const { service } = setupAvailableSlotsTest(event)

		const result = await service.getAvailableSlots(100, 1, 1)

		expect(result).toHaveLength(3)
	})

	test("returns all slot groups when no waves configured", async () => {
		const event = createClubEvent({
			signupWaves: null,
			totalGroups: 12,
			signupStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
			signupEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
		})
		const { service } = setupAvailableSlotsTest(event)

		const result = await service.getAvailableSlots(100, 1, 1)

		expect(result).toHaveLength(3)
	})
})
