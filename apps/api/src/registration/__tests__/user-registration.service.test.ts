import { ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common"
import {
	RegistrationStatusChoices,
	RegistrationTypeChoices,
	EventTypeChoices,
} from "@repo/domain/types"
import type { ClubEvent, ReserveRequest, DjangoUser } from "@repo/domain/types"

import {
	AlreadyRegisteredError,
	CourseRequiredError,
	EventFullError,
	EventRegistrationNotOpenError,
	SlotConflictError,
	SlotOverflowError,
} from "../errors/registration.errors"
import { UserRegistrationService } from "../services/user-registration.service"
import type {
	PlayerRow,
	RegistrationRow,
	RegistrationSlotRow,
	RegistrationFull,
	RegistrationSlotFull,
	RegistrationWithSlots,
} from "../../database"

// =============================================================================
// Test Fixtures
// =============================================================================

const createDjangoUser = (overrides: Partial<DjangoUser> = {}): DjangoUser => ({
	id: 10,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	playerId: 1,
	isStaff: false,
	isActive: true,
	isSuperuser: false,
	ghin: null,
	birthDate: null,
	...overrides,
})

// Use dates that put us in the "registration" window
const now = new Date()
const signupStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
const signupEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // Next week

const createClubEvent = (overrides: Partial<ClubEvent> = {}): ClubEvent => ({
	id: 100,
	eventType: EventTypeChoices.WEEKNIGHT,
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
	signupStart,
	signupEnd,
	eventFees: [],
	...overrides,
})

const createReserveRequest = (overrides: Partial<ReserveRequest> = {}): ReserveRequest => ({
	eventId: 100,
	slotIds: [1, 2],
	courseId: 1,
	...overrides,
})

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

const createRegistrationRow = (overrides: Partial<RegistrationRow> = {}): RegistrationRow => ({
	id: 1,
	eventId: 100,
	userId: 10,
	courseId: 1,
	signedUpBy: "John Doe",
	notes: null,
	expires: "2025-06-01 08:05:00",
	ggId: null,
	createdDate: "2025-06-01 08:00:00",
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
	status: RegistrationStatusChoices.PENDING,
	ggId: null,
	...overrides,
})

const createRegistrationSlotFull = (
	overrides: Partial<RegistrationSlotFull> = {},
): RegistrationSlotFull => ({
	...createRegistrationSlotRow(),
	player: createPlayerRow(),
	fees: [],
	...overrides,
})

const createRegistrationFull = (overrides: Partial<RegistrationFull> = {}): RegistrationFull => ({
	...createRegistrationRow(),
	slots: [createRegistrationSlotFull()],
	...overrides,
})

const createRegistrationWithSlots = (
	overrides: Partial<RegistrationWithSlots> = {},
): RegistrationWithSlots => ({
	...createRegistrationRow(),
	slots: [createRegistrationSlotRow()],
	...overrides,
})

// =============================================================================
// Mock Setup
// =============================================================================

const createMockRegistrationRepository = () => ({
	findRegistrationFullById: jest.fn(),
	findRegistrationIdByEventAndPlayer: jest.fn(),
	findRegistrationByUserAndEvent: jest.fn(),
	findRegistrationSlotById: jest.fn(),
	findRegistrationSlotWithHoleById: jest.fn(),
	updateRegistrationSlot: jest.fn(),
	updateRegistrationSlots: jest.fn(),
	deleteRegistration: jest.fn(),
	deleteRegistrationSlotsByRegistration: jest.fn(),
	updateRegistration: jest.fn(),
	createRegistration: jest.fn(),
})

const createMockEventsService = () => ({
	getCompleteClubEventById: jest.fn(),
	isCanChooseHolesEvent: jest.fn(),
})

const createMockPaymentsService = () => ({
	deletePaymentAndFees: jest.fn(),
})

const createMockDrizzleService = () => {
	// Create a chainable AND thenable mock
	// Supports: .select().from().where().for() AND await .select().from().where()
	const createChainableMock = () => {
		const createThenableChain = (defaultValue: unknown[] = []): any => {
			const chain: any = {
				select: jest.fn(() => chain),
				from: jest.fn(() => chain),
				where: jest.fn(() => chain),
				for: jest.fn().mockResolvedValue(defaultValue),
				insert: jest.fn(() => chain),
				values: jest.fn().mockResolvedValue([{ insertId: 1 }]),
				update: jest.fn(() => chain),
				set: jest.fn(() => chain),
				// Make it thenable - when awaited without .for(), returns defaultValue
				then: (resolve: (val: unknown) => void) => Promise.resolve(defaultValue).then(resolve),
			}
			return chain
		}
		return createThenableChain()
	}

	const mockTx = createChainableMock()

	return {
		db: {
			transaction: jest.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
				return callback(mockTx)
			}),
		},
		mockTx,
	}
}

const createMockBroadcastService = () => ({
	notifyChange: jest.fn(),
})

function createService() {
	const repository = createMockRegistrationRepository()
	const eventsService = createMockEventsService()
	const paymentsService = createMockPaymentsService()
	const { db, mockTx } = createMockDrizzleService()
	const broadcastService = createMockBroadcastService()

	const service = new UserRegistrationService(
		repository as any,
		paymentsService as any,
		eventsService as any,
		{ db } as any,
		broadcastService as any,
	)

	return { service, repository, eventsService, paymentsService, db, mockTx, broadcastService }
}

// =============================================================================
// Tests
// =============================================================================

describe("UserRegistrationService", () => {
	describe("createAndReserve", () => {
		describe("choosable events", () => {
			it("routes to choosable flow when event.canChoose is true", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				mockTx.for.mockResolvedValue([
					{ ...createRegistrationSlotRow(), status: RegistrationStatusChoices.AVAILABLE },
					{
						...createRegistrationSlotRow({ id: 2 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
				])
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				await service.createAndReserve(user, request)

				// Verify choosable flow was used (findRegistrationByUserAndEvent is called in choosable flow)
				expect(repository.findRegistrationByUserAndEvent).toHaveBeenCalledWith(user.id, event.id)
			})

			it("creates new registration when user has none", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				mockTx.for.mockResolvedValue([
					{ ...createRegistrationSlotRow(), status: RegistrationStatusChoices.AVAILABLE },
				])
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				await service.createAndReserve(user, request)

				expect(mockTx.insert).toHaveBeenCalled()
			})

			it("throws SlotConflictError when requested slots not AVAILABLE", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				// Return slots that are already PENDING (not AVAILABLE)
				mockTx.for.mockResolvedValue([
					{ ...createRegistrationSlotRow(), status: RegistrationStatusChoices.PENDING },
				])

				await expect(service.createAndReserve(user, request)).rejects.toThrow(SlotConflictError)
			})

			it("throws AlreadyRegisteredError when user has RESERVED slots", async () => {
				const { service, eventsService, repository } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(
					createRegistrationWithSlots({
						slots: [createRegistrationSlotRow({ status: RegistrationStatusChoices.RESERVED })],
					}),
				)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(
					AlreadyRegisteredError,
				)
			})
		})

		describe("non-choosable events", () => {
			it("routes to non-choosable flow when event.canChoose is false", async () => {
				const { service, eventsService, repository } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: false, maximumSignupGroupSize: 2 })
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				await service.createAndReserve(user, request)

				// Non-choosable flow doesn't call findRegistrationByUserAndEvent outside transaction
				expect(repository.findRegistrationByUserAndEvent).not.toHaveBeenCalled()
			})

			it("creates correct number of slots from maximumSignupGroupSize", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					canChoose: false,
					maximumSignupGroupSize: 4,
				})
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				await service.createAndReserve(user, request)

				// Should insert 4 slots (one per insert call after registration insert)
				// Registration insert + 4 slot inserts = 5 total
				expect(mockTx.insert).toHaveBeenCalledTimes(5)
			})

			it("throws EventFullError when capacity exceeded", async () => {
				const { service, eventsService, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					canChoose: false,
					registrationMaximum: 10,
				})
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				// Return 10 locked slots (at capacity)
				mockTx.for.mockResolvedValue(Array(10).fill({ id: 1 }))

				await expect(service.createAndReserve(user, request)).rejects.toThrow(EventFullError)
			})

			// NOTE: Testing AlreadyRegisteredError in non-choosable flow requires complex
			// transaction state mocking. This behavior is better tested via integration tests.
		})

		describe("validation", () => {
			it("throws EventRegistrationNotOpenError when window is future", async () => {
				const { service, eventsService } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					signupStart: "2099-06-01T08:00:00",
					signupEnd: "2099-06-14T00:00:00",
				})
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(
					EventRegistrationNotOpenError,
				)
			})

			it("throws EventRegistrationNotOpenError when window is past", async () => {
				const { service, eventsService } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					signupStart: "2020-06-01T08:00:00",
					signupEnd: "2020-06-14T00:00:00",
				})
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(
					EventRegistrationNotOpenError,
				)
			})

			it("throws CourseRequiredError for choosable event without courseId", async () => {
				const { service, eventsService } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest({ courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(CourseRequiredError)
			})

			it("throws BadRequestException for choosable event with 0 slots", async () => {
				const { service, eventsService } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest({ slotIds: [] })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(BadRequestException)
			})
		})
	})

	describe("addPlayersToRegistration", () => {
		it("throws SlotOverflowError when more players than empty slots", async () => {
			const { service, repository } = createService()

			// Mapper converts playerId: null → undefined
			// So emptySlots will be empty, triggering SlotOverflowError
			const regFull = createRegistrationFull({
				slots: [
					createRegistrationSlotFull({ id: 1, playerId: 1 }),
					createRegistrationSlotFull({ id: 2, playerId: null }), // Will be undefined after mapping
				],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)

			await expect(service.addPlayersToRegistration(1, [2, 3, 4], 1)).rejects.toThrow(
				SlotOverflowError,
			)
		})

		it("throws ForbiddenException when caller not group member", async () => {
			const { service, repository } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ playerId: 999 })], // Different player
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)

			await expect(service.addPlayersToRegistration(1, [2], 1)).rejects.toThrow(ForbiddenException)
		})
	})

	describe("cancelRegistration", () => {
		it("resets slots to AVAILABLE for choosable events", async () => {
			const { service, repository, eventsService } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ id: 1 }), createRegistrationSlotFull({ id: 2 })],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.isCanChooseHolesEvent.mockResolvedValue(true)
			repository.updateRegistrationSlots.mockResolvedValue(undefined)
			repository.deleteRegistration.mockResolvedValue(undefined)

			await service.cancelRegistration(1, 1)

			expect(repository.updateRegistrationSlots).toHaveBeenCalledWith([1, 2], {
				status: RegistrationStatusChoices.AVAILABLE,
				registrationId: null,
				playerId: null,
			})
			expect(repository.deleteRegistration).toHaveBeenCalledWith(1)
		})

		it("deletes slots entirely for non-choosable events", async () => {
			const { service, repository, eventsService } = createService()

			const regFull = createRegistrationFull()

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.isCanChooseHolesEvent.mockResolvedValue(false)
			repository.deleteRegistrationSlotsByRegistration.mockResolvedValue(undefined)
			repository.deleteRegistration.mockResolvedValue(undefined)

			await service.cancelRegistration(1, 1)

			expect(repository.deleteRegistrationSlotsByRegistration).toHaveBeenCalledWith(1)
			expect(repository.deleteRegistration).toHaveBeenCalledWith(1)
		})

		it("deletes payment when paymentId provided", async () => {
			const { service, repository, eventsService, paymentsService } = createService()

			const regFull = createRegistrationFull()

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.isCanChooseHolesEvent.mockResolvedValue(true)
			repository.updateRegistrationSlots.mockResolvedValue(undefined)
			repository.deleteRegistration.mockResolvedValue(undefined)
			paymentsService.deletePaymentAndFees.mockResolvedValue(undefined)

			await service.cancelRegistration(1, 1, 123)

			expect(paymentsService.deletePaymentAndFees).toHaveBeenCalledWith(123)
		})

		it("throws NotFoundException when registration not found", async () => {
			const { service, repository } = createService()

			repository.findRegistrationFullById.mockResolvedValue(null)

			// findRegistrationById throws NotFoundException before the soft check in cancelRegistration
			await expect(service.cancelRegistration(1, 1)).rejects.toThrow(NotFoundException)
		})
	})

	describe("findRegistrationById", () => {
		it("returns registration when playerId is in group", async () => {
			const { service, repository } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ playerId: 1 })],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)

			const result = await service.findRegistrationById(1, 1)

			expect(result).toBeDefined()
			expect(result.id).toBe(1)
		})

		it("throws ForbiddenException when playerId not in group", async () => {
			const { service, repository } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ playerId: 999 })],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)

			await expect(service.findRegistrationById(1, 1)).rejects.toThrow(ForbiddenException)
		})

		it("throws NotFoundException when registration not found", async () => {
			const { service, repository } = createService()

			repository.findRegistrationFullById.mockResolvedValue(null)

			await expect(service.findRegistrationById(999)).rejects.toThrow(NotFoundException)
		})

		it("skips authorization when playerId not provided", async () => {
			const { service, repository } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ playerId: 999 })], // Different player
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)

			// Should not throw even though playerId doesn't match
			const result = await service.findRegistrationById(1)

			expect(result).toBeDefined()
		})
	})
})
