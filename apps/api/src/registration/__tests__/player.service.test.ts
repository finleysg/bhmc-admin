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

const createMockDrizzleService = () => ({
	db: {
		transaction: jest.fn(),
	},
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
		const { service, repository } = createService()

		repository.findRegistrationSlotById.mockResolvedValue(createRegistrationSlotRow())
		repository.findRegisteredPlayers.mockResolvedValue([createPlayerRow({ id: 5 })])

		const result = await service.replacePlayer(100, {
			slotId: 1,
			originalPlayerId: 1,
			replacementPlayerId: 2,
		})

		expect(result.slotId).toBe(1)
	})
})
