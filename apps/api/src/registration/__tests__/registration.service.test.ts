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
	MembersOnlyError,
	PlayerConflictError,
	ReturningMembersOnlyError,
	SlotConflictError,
	SlotOverflowError,
} from "../errors/registration.errors"
import { RegistrationService } from "../services/registration.service"
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
	registrationType: RegistrationTypeChoices.OPEN,
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
	sessionId: null,
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
	findPlayerByUserId: jest.fn(),
	updateRegistrationSlot: jest.fn(),
	updateRegistrationSlots: jest.fn(),
	deleteRegistration: jest.fn(),
	deleteRegistrationSlotsByRegistration: jest.fn(),
	updateRegistration: jest.fn(),
	createRegistration: jest.fn(),
	countSlotsByEventAndStatus: jest.fn(),
	countPlayerSlotsByEventAndStatus: jest.fn(),
	countSlotsByEvent: jest.fn(),
})

const createMockEventsService = () => ({
	getCompleteClubEventById: jest.fn(),
	isCanChooseHolesEvent: jest.fn(),
	getEventById: jest.fn(),
})

const createMockPaymentsService = () => ({
	deletePaymentAndFees: jest.fn(),
	deletePaymentsForRegistration: jest.fn(),
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
				orderBy: jest.fn(() => chain),
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

const createMockSlotCleanupService = () => ({
	releaseSlots: jest.fn(),
	releaseSlotsByRegistration: jest.fn(),
})

function createService() {
	const repository = createMockRegistrationRepository()
	const eventsService = createMockEventsService()
	const paymentsService = createMockPaymentsService()
	const { db, mockTx } = createMockDrizzleService()
	const broadcastService = createMockBroadcastService()
	const slotCleanupService = createMockSlotCleanupService()

	const service = new RegistrationService(
		repository as any,
		paymentsService as any,
		eventsService as any,
		{ db } as any,
		broadcastService as any,
		slotCleanupService as any,
	)

	return {
		service,
		repository,
		eventsService,
		paymentsService,
		db,
		mockTx,
		broadcastService,
		slotCleanupService,
	}
}

// =============================================================================
// Tests
// =============================================================================

describe("RegistrationService", () => {
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
					{
						...createRegistrationSlotRow({ id: 1 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
					{
						...createRegistrationSlotRow({ id: 2 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
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

			it("throws SlotConflictError when fewer slots returned than requested", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				// Request 2 slots
				const request = createReserveRequest({ slotIds: [1, 2] })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				// SELECT...FOR UPDATE only finds 1 slot (the other was deleted, e.g. by an
				// event sync). Without the defensive check the service would silently
				// create a registration with only 1 slot — the user would see an FK or
				// "no empty slots" error when trying to add a player.
				mockTx.for.mockResolvedValue([
					{ ...createRegistrationSlotRow({ id: 1 }), status: RegistrationStatusChoices.AVAILABLE },
				])

				await expect(service.createAndReserve(user, request)).rejects.toThrow(SlotConflictError)
				expect(mockTx.insert).not.toHaveBeenCalled()
			})

			it("broadcasts slot change after cleaning up a stale can-choose registration", async () => {
				const {
					service,
					eventsService,
					repository,
					paymentsService,
					mockTx,
					slotCleanupService,
					broadcastService,
				} = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(
					createRegistrationWithSlots({
						id: 50,
						slots: [
							createRegistrationSlotRow({
								id: 101,
								status: RegistrationStatusChoices.PENDING,
								registrationId: 50,
							}),
						],
					}),
				)
				// findRegistrationFullById is called twice: once inside cleanup to
				// resolve eventId for broadcast, then again at the end of createAndReserve
				// to return the new registration.
				repository.findRegistrationFullById
					.mockResolvedValueOnce(createRegistrationFull({ id: 50, eventId: 100 }))
					.mockResolvedValueOnce(createRegistrationFull())
				mockTx.for.mockResolvedValue([
					{
						...createRegistrationSlotRow({ id: 1 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
					{
						...createRegistrationSlotRow({ id: 2 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
				])

				await service.createAndReserve(user, request)

				expect(paymentsService.deletePaymentsForRegistration).toHaveBeenCalledWith(50)
				expect(slotCleanupService.releaseSlotsByRegistration).toHaveBeenCalledWith(50, true)
				// Two broadcasts: one from cleanup (slots released to AVAILABLE), one from
				// successful reservation (slots claimed to PENDING). Both are visible
				// state changes that other clients on the tee sheet must see immediately.
				expect(broadcastService.notifyChange).toHaveBeenCalledWith(100)
				expect(broadcastService.notifyChange).toHaveBeenCalledTimes(2)
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

			it("throws AlreadyRegisteredError when user has AWAITING_PAYMENT slots", async () => {
				const { service, eventsService, repository } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(
					createRegistrationWithSlots({
						slots: [
							createRegistrationSlotRow({
								status: RegistrationStatusChoices.AWAITING_PAYMENT,
							}),
						],
					}),
				)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(
					AlreadyRegisteredError,
				)
			})

			it("cleans up stale PENDING registration and creates new one", async () => {
				const { service, eventsService, repository, paymentsService, mockTx, slotCleanupService } =
					createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: true })
				const request = createReserveRequest()

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(
					createRegistrationWithSlots({
						id: 50,
						slots: [
							createRegistrationSlotRow({
								id: 101,
								status: RegistrationStatusChoices.PENDING,
								registrationId: 50,
							}),
						],
					}),
				)
				mockTx.for.mockResolvedValue([
					{
						...createRegistrationSlotRow({ id: 1 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
					{
						...createRegistrationSlotRow({ id: 2 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
				])
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				await service.createAndReserve(user, request)

				// Old registration should be cleaned up
				expect(paymentsService.deletePaymentsForRegistration).toHaveBeenCalledWith(50)
				expect(slotCleanupService.releaseSlotsByRegistration).toHaveBeenCalledWith(50, true)
				expect(repository.deleteRegistration).toHaveBeenCalledWith(50)

				// New registration should be created (insert called)
				expect(mockTx.insert).toHaveBeenCalled()
			})
			it("assigns user to lowest slot ID regardless of slotIds order", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser({ playerId: 42 })
				const event = createClubEvent({ canChoose: true })
				// slotIds in reverse order: higher ID first
				const request = createReserveRequest({ slotIds: [200, 100] })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				mockTx.for.mockResolvedValue([
					{
						...createRegistrationSlotRow({ id: 200 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
					{
						...createRegistrationSlotRow({ id: 100 }),
						status: RegistrationStatusChoices.AVAILABLE,
					},
				])
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				await service.createAndReserve(user, request)

				// The set() calls update each slot. Verify that playerId 42 was
				// assigned to the lowest slot ID (100), not slotIds[0] (200).
				const setCalls = mockTx.set.mock.calls as Array<[Record<string, unknown>]>
				const playerAssignments = setCalls.map((call) => call[0]).filter((arg) => "playerId" in arg)
				expect(playerAssignments).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ playerId: 42 }),
						expect.objectContaining({ playerId: null }),
					]),
				)
				// The update with playerId should target slot 100 (the lowest)
				// The update().where() chain is called for each slot. Since mockTx is
				// chainable, we verify via the set calls that exactly one has the player.
				const withPlayer = playerAssignments.filter((a) => a.playerId === 42)
				expect(withPlayer).toHaveLength(1)
			})
		})

		describe("non-choosable events", () => {
			it("routes to non-choosable flow when event.canChoose is false", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: false, maximumSignupGroupSize: 2 })
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				// Mock capacity count + no existing registration in tx
				let queryCount = 0
				mockTx.then = (resolve: (val: unknown) => void) => {
					queryCount++
					if (queryCount === 1) return Promise.resolve([{ count: 0 }]).then(resolve)
					return Promise.resolve([]).then(resolve)
				}

				await service.createAndReserve(user, request)

				// Non-choosable flow now calls findRegistrationByUserAndEvent for pre-tx cleanup
				expect(repository.findRegistrationByUserAndEvent).toHaveBeenCalledWith(user.id, event.id)
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
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				// Mock capacity count + no existing registration in tx
				let queryCount = 0
				mockTx.then = (resolve: (val: unknown) => void) => {
					queryCount++
					if (queryCount === 1) return Promise.resolve([{ count: 0 }]).then(resolve)
					return Promise.resolve([]).then(resolve)
				}

				await service.createAndReserve(user, request)

				// Should insert 4 slots (one per insert call after registration insert)
				// Registration insert + 4 slot inserts = 5 total
				expect(mockTx.insert).toHaveBeenCalledTimes(5)
			})

			it("throws EventFullError when capacity exceeded", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					canChoose: false,
					registrationMaximum: 10,
				})
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)

				// Return count of 10 (at capacity)
				mockTx.then = (resolve: (val: unknown) => void) =>
					Promise.resolve([{ count: 10 }]).then(resolve)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(EventFullError)
			})

			it("fully cleans up stale PENDING registration for non-choosable event", async () => {
				const { service, eventsService, repository, paymentsService, mockTx, slotCleanupService } =
					createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: false, maximumSignupGroupSize: 2 })
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)

				// Pre-tx: existing registration with only PENDING slots
				repository.findRegistrationByUserAndEvent.mockResolvedValue(
					createRegistrationWithSlots({
						id: 60,
						slots: [
							createRegistrationSlotRow({
								status: RegistrationStatusChoices.PENDING,
								registrationId: 60,
							}),
						],
					}),
				)
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				// In-tx: capacity count + no existing registration (already cleaned up)
				let queryCount = 0
				mockTx.then = (resolve: (val: unknown) => void) => {
					queryCount++
					if (queryCount === 1) return Promise.resolve([{ count: 0 }]).then(resolve)
					return Promise.resolve([]).then(resolve)
				}

				await service.createAndReserve(user, request)

				// Old registration should be cleaned up before the transaction
				expect(paymentsService.deletePaymentsForRegistration).toHaveBeenCalledWith(60)
				expect(slotCleanupService.releaseSlotsByRegistration).toHaveBeenCalledWith(60, false)
				expect(repository.deleteRegistration).toHaveBeenCalledWith(60)
			})

			it("throws AlreadyRegisteredError when non-choosable existing registration has RESERVED slots", async () => {
				const { service, eventsService, repository } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({ canChoose: false, maximumSignupGroupSize: 2 })
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)

				// Pre-tx: existing registration with RESERVED slots
				repository.findRegistrationByUserAndEvent.mockResolvedValue(
					createRegistrationWithSlots({
						id: 60,
						slots: [
							createRegistrationSlotRow({
								status: RegistrationStatusChoices.RESERVED,
								registrationId: 60,
							}),
						],
					}),
				)

				await expect(service.createAndReserve(user, request)).rejects.toThrow(
					AlreadyRegisteredError,
				)
			})
		})

		describe("members only", () => {
			it("rejects non-member on members-only event", async () => {
				const { service, eventsService, repository } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					registrationType: RegistrationTypeChoices.MEMBER,
					canChoose: false,
				})
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findPlayerByUserId.mockResolvedValue(createPlayerRow({ isMember: 0 }))

				await expect(service.createAndReserve(user, request)).rejects.toThrow(MembersOnlyError)
			})

			it("allows member on members-only event", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					registrationType: RegistrationTypeChoices.MEMBER,
					canChoose: false,
				})
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findPlayerByUserId.mockResolvedValue(createPlayerRow({ isMember: 1 }))
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				// Mock capacity count + no existing registration in tx
				let queryCount = 0
				mockTx.then = (resolve: (val: unknown) => void) => {
					queryCount++
					if (queryCount === 1) return Promise.resolve([{ count: 0 }]).then(resolve)
					return Promise.resolve([]).then(resolve)
				}

				await expect(service.createAndReserve(user, request)).resolves.toBeDefined()
			})
		})

		describe("returning members only", () => {
			it("rejects non-returning member on returning-members-only event", async () => {
				const { service, eventsService, repository } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					registrationType: RegistrationTypeChoices.RETURNING_MEMBER,
					canChoose: false,
				})
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findPlayerByUserId.mockResolvedValue(createPlayerRow({ lastSeason: null }))

				await expect(service.createAndReserve(user, request)).rejects.toThrow(
					ReturningMembersOnlyError,
				)
			})

			it("allows returning member on returning-members-only event", async () => {
				const { service, eventsService, repository, mockTx } = createService()
				const user = createDjangoUser()
				const event = createClubEvent({
					registrationType: RegistrationTypeChoices.RETURNING_MEMBER,
					canChoose: false,
					season: 2025,
				})
				const request = createReserveRequest({ slotIds: [], courseId: undefined })

				eventsService.getCompleteClubEventById.mockResolvedValue(event)
				repository.findPlayerByUserId.mockResolvedValue(createPlayerRow({ lastSeason: 2024 }))
				repository.findRegistrationByUserAndEvent.mockResolvedValue(null)
				repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

				// Mock capacity count + no existing registration in tx
				let queryCount = 0
				mockTx.then = (resolve: (val: unknown) => void) => {
					queryCount++
					if (queryCount === 1) return Promise.resolve([{ count: 0 }]).then(resolve)
					return Promise.resolve([]).then(resolve)
				}

				await expect(service.createAndReserve(user, request)).resolves.toBeDefined()
			})
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

	describe("updateSlotPlayer", () => {
		it("throws PlayerConflictError on duplicate entry", async () => {
			// GIVEN: Repository throws a Drizzle-wrapped duplicate entry error
			const { service, repository } = createService()
			const drizzleError = new Error("Failed query: update ...")
			;(drizzleError as any).cause = { errno: 1062, code: "ER_DUP_ENTRY" }
			repository.updateRegistrationSlot.mockRejectedValue(drizzleError)

			// WHEN: Updating slot player
			// THEN: PlayerConflictError (409) is thrown
			await expect(service.updateSlotPlayer(1, 237)).rejects.toThrow(PlayerConflictError)
		})

		it("rethrows non-duplicate errors", async () => {
			// GIVEN: Repository throws a generic error
			const { service, repository } = createService()
			repository.updateRegistrationSlot.mockRejectedValue(new Error("Connection lost"))

			// WHEN/THEN: Original error propagates
			await expect(service.updateSlotPlayer(1, 237)).rejects.toThrow("Connection lost")
		})

		it("returns slot on success", async () => {
			// GIVEN: Repository succeeds
			const { service, repository } = createService()
			repository.updateRegistrationSlot.mockResolvedValue(createRegistrationSlotRow())

			// WHEN: Updating slot player
			const result = await service.updateSlotPlayer(1, 237)

			// THEN: Mapped slot returned
			expect(result).toBeDefined()
			expect(result.id).toBe(1)
		})
	})

	describe("addPlayersToRegistration", () => {
		it("throws SlotOverflowError when occupied + new players exceeds group size (non-canChoose)", async () => {
			const { service, repository, eventsService } = createService()

			// 2 occupied slots, maxGroupSize=3, trying to add 2 → overflow (2 + 2 > 3)
			const regFull = createRegistrationFull({
				slots: [
					createRegistrationSlotFull({ id: 1, playerId: 1, slot: 0 }),
					createRegistrationSlotFull({ id: 2, playerId: 2, slot: 1 }),
				],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.getEventById.mockResolvedValue({
				canChoose: false,
				maximumSignupGroupSize: 3,
				groupSize: 3,
			})

			await expect(service.addPlayersToRegistration(1, [3, 4], 1)).rejects.toThrow(
				SlotOverflowError,
			)
		})

		it("creates new slots when adding players after drop (non-canChoose)", async () => {
			const { service, repository, eventsService, mockTx } = createService()

			// 2 occupied slots, no empty slots (dropped slots were deleted)
			const regFull = createRegistrationFull({
				slots: [
					createRegistrationSlotFull({ id: 1, playerId: 1, slot: 0 }),
					createRegistrationSlotFull({ id: 2, playerId: 2, slot: 1 }),
				],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.getEventById.mockResolvedValue({
				canChoose: false,
				maximumSignupGroupSize: 4,
				groupSize: 4,
			})

			// findRegistrationFullById is called again after the transaction
			repository.findRegistrationFullById.mockResolvedValue(regFull)

			await service.addPlayersToRegistration(1, [3, 4], 1)

			// Should have inserted 2 new slots via transaction
			expect(mockTx.insert).toHaveBeenCalledTimes(2)
		})

		it("throws ForbiddenException when caller not group member", async () => {
			const { service, repository } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ playerId: 999 })], // Different player
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)

			await expect(service.addPlayersToRegistration(1, [2], 1)).rejects.toThrow(ForbiddenException)
		})

		it("inherits sessionId from existing slots when creating new slots (non-canChoose)", async () => {
			const { service, repository, eventsService, mockTx } = createService()

			// 2 occupied slots with sessionId: 7, no empty slots
			const regFull = createRegistrationFull({
				slots: [
					createRegistrationSlotFull({ id: 1, playerId: 1, slot: 0, sessionId: 7 }),
					createRegistrationSlotFull({ id: 2, playerId: 2, slot: 1, sessionId: 7 }),
				],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.getEventById.mockResolvedValue({
				canChoose: false,
				maximumSignupGroupSize: 4,
				groupSize: 4,
			})

			await service.addPlayersToRegistration(1, [3, 4], 1)

			// Should have inserted 2 new slots with sessionId: 7
			expect(mockTx.insert).toHaveBeenCalledTimes(2)
			expect(mockTx.values).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 7 }))
		})

		it("inherits sessionId from existing slots when filling empty slots (non-canChoose)", async () => {
			const { service, repository, eventsService } = createService()

			// 1 occupied slot (sessionId: 7) + 1 empty slot (no player, sessionId: null)
			const regFull = createRegistrationFull({
				slots: [
					createRegistrationSlotFull({ id: 1, playerId: 1, slot: 0, sessionId: 7 }),
					createRegistrationSlotFull({
						id: 2,
						playerId: undefined as any,
						slot: 1,
						sessionId: null,
					}),
				],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.getEventById.mockResolvedValue({
				canChoose: false,
				maximumSignupGroupSize: 4,
				groupSize: 4,
			})

			await service.addPlayersToRegistration(1, [3], 1)

			// Should have updated the empty slot with sessionId: 7
			expect(repository.updateRegistrationSlot).toHaveBeenCalledWith(
				2,
				expect.objectContaining({ sessionId: 7 }),
				expect.anything(),
			)
		})

		it("inherits sessionId from existing slots when claiming available slots (canChoose)", async () => {
			const { service, repository, eventsService, mockTx } = createService()

			// 2 occupied slots with sessionId: 7
			const regFull = createRegistrationFull({
				slots: [
					createRegistrationSlotFull({
						id: 1,
						playerId: 1,
						slot: 0,
						holeId: 10,
						startingOrder: 0,
						sessionId: 7,
					}),
					createRegistrationSlotFull({
						id: 2,
						playerId: 2,
						slot: 1,
						holeId: 10,
						startingOrder: 0,
						sessionId: 7,
					}),
				],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.getEventById.mockResolvedValue({ canChoose: true })

			// Mock available slots query to return available slots on the same hole
			mockTx.for.mockResolvedValue([
				createRegistrationSlotRow({
					id: 10,
					holeId: 10,
					startingOrder: 0,
					slot: 2,
					status: RegistrationStatusChoices.AVAILABLE,
				}),
			])

			await service.addPlayersToRegistration(1, [3], 1)

			// Should have updated the available slot with sessionId: 7
			expect(mockTx.set).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 7 }))
		})

		it("rejects non-member player on members-only event", async () => {
			const { service, repository, eventsService, mockTx } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ id: 1, playerId: 1, slot: 0 })],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.getEventById.mockResolvedValue({
				canChoose: false,
				maximumSignupGroupSize: 4,
				groupSize: 4,
				registrationType: RegistrationTypeChoices.MEMBER,
				season: 2025,
			})

			// Mock tx.select().from().where() to return a non-member player
			mockTx.then = (resolve: (val: unknown) => void) =>
				Promise.resolve([
					{ id: 3, firstName: "Guest", lastName: "Player", isMember: 0, lastSeason: null },
				]).then(resolve)

			await expect(service.addPlayersToRegistration(1, [3], 1)).rejects.toThrow(MembersOnlyError)
		})

		it("rejects non-returning player on returning-members-only event", async () => {
			const { service, repository, eventsService, mockTx } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ id: 1, playerId: 1, slot: 0 })],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.getEventById.mockResolvedValue({
				canChoose: false,
				maximumSignupGroupSize: 4,
				groupSize: 4,
				registrationType: RegistrationTypeChoices.RETURNING_MEMBER,
				season: 2025,
			})

			// Mock tx.select().from().where() to return a player with wrong lastSeason
			mockTx.then = (resolve: (val: unknown) => void) =>
				Promise.resolve([
					{ id: 3, firstName: "Old", lastName: "Member", isMember: 1, lastSeason: 2023 },
				]).then(resolve)

			await expect(service.addPlayersToRegistration(1, [3], 1)).rejects.toThrow(
				ReturningMembersOnlyError,
			)
		})
	})

	describe("cancelRegistration", () => {
		it("releases slots for choosable events", async () => {
			const { service, repository, eventsService, slotCleanupService } = createService()

			const regFull = createRegistrationFull({
				slots: [createRegistrationSlotFull({ id: 1 }), createRegistrationSlotFull({ id: 2 })],
			})

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.isCanChooseHolesEvent.mockResolvedValue(true)
			repository.deleteRegistration.mockResolvedValue(undefined)

			await service.cancelRegistration(1, 1)

			expect(slotCleanupService.releaseSlotsByRegistration).toHaveBeenCalledWith(1, true)
			expect(repository.deleteRegistration).toHaveBeenCalledWith(1)
		})

		it("releases slots for non-choosable events", async () => {
			const { service, repository, eventsService, slotCleanupService } = createService()

			const regFull = createRegistrationFull()

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.isCanChooseHolesEvent.mockResolvedValue(false)
			repository.deleteRegistration.mockResolvedValue(undefined)

			await service.cancelRegistration(1, 1)

			expect(slotCleanupService.releaseSlotsByRegistration).toHaveBeenCalledWith(1, false)
			expect(repository.deleteRegistration).toHaveBeenCalledWith(1)
		})

		it("deletes payment when paymentId provided", async () => {
			const { service, repository, eventsService, paymentsService } = createService()

			const regFull = createRegistrationFull()

			repository.findRegistrationFullById.mockResolvedValue(regFull)
			eventsService.isCanChooseHolesEvent.mockResolvedValue(true)
			repository.deleteRegistration.mockResolvedValue(undefined)
			paymentsService.deletePaymentAndFees.mockResolvedValue(undefined)

			await service.cancelRegistration(1, 1, 123)

			expect(paymentsService.deletePaymentAndFees).toHaveBeenCalledWith(123)
		})

		// TODO: fix the service to convert TypeError to NotFoundException in this case
		it.skip("throws NotFoundException when registration not found", async () => {
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
		// TODO: fix the service to convert TypeError to NotFoundException in this case
		it.skip("throws NotFoundException when registration not found", async () => {
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

	describe("getAvailableSpots", () => {
		describe("canChoose events", () => {
			it("returns available slots count and total slots for canChoose event", async () => {
				const { service, eventsService, repository } = createService()

				eventsService.getEventById.mockResolvedValue(createClubEvent({ canChoose: true }))
				repository.countSlotsByEventAndStatus.mockResolvedValue(10) // 10 available
				repository.countSlotsByEvent.mockResolvedValue(40) // 40 total

				const result = await service.getAvailableSpots(100)

				expect(result).toEqual({ availableSpots: 10, totalSpots: 40 })
				expect(repository.countSlotsByEventAndStatus).toHaveBeenCalledWith(100, [
					RegistrationStatusChoices.AVAILABLE,
				])
				expect(repository.countSlotsByEvent).toHaveBeenCalledWith(100)
			})

			it("returns 0 available when all slots taken", async () => {
				const { service, eventsService, repository } = createService()

				eventsService.getEventById.mockResolvedValue(createClubEvent({ canChoose: true }))
				repository.countSlotsByEventAndStatus.mockResolvedValue(0)
				repository.countSlotsByEvent.mockResolvedValue(40)

				const result = await service.getAvailableSpots(100)

				expect(result).toEqual({ availableSpots: 0, totalSpots: 40 })
			})

			it("returns 0 total when no slots created yet", async () => {
				const { service, eventsService, repository } = createService()

				eventsService.getEventById.mockResolvedValue(createClubEvent({ canChoose: true }))
				repository.countSlotsByEventAndStatus.mockResolvedValue(0)
				repository.countSlotsByEvent.mockResolvedValue(0)

				const result = await service.getAvailableSpots(100)

				expect(result).toEqual({ availableSpots: 0, totalSpots: 0 })
			})
		})

		describe("non-canChoose events", () => {
			it("returns available based on registrationMaximum minus players", async () => {
				const { service, eventsService, repository } = createService()

				eventsService.getEventById.mockResolvedValue(
					createClubEvent({ canChoose: false, registrationMaximum: 100 }),
				)
				repository.countPlayerSlotsByEventAndStatus.mockResolvedValue(25) // 25 players

				const result = await service.getAvailableSpots(100)

				expect(result).toEqual({ availableSpots: 75, totalSpots: 100 })
				expect(repository.countPlayerSlotsByEventAndStatus).toHaveBeenCalledWith(100, [
					RegistrationStatusChoices.PENDING,
					RegistrationStatusChoices.AWAITING_PAYMENT,
					RegistrationStatusChoices.RESERVED,
				])
			})

			it("returns 0 available when at capacity", async () => {
				const { service, eventsService, repository } = createService()

				eventsService.getEventById.mockResolvedValue(
					createClubEvent({ canChoose: false, registrationMaximum: 50 }),
				)
				repository.countPlayerSlotsByEventAndStatus.mockResolvedValue(50)

				const result = await service.getAvailableSpots(100)

				expect(result).toEqual({ availableSpots: 0, totalSpots: 50 })
			})

			it("returns 0 available even if overbooked", async () => {
				const { service, eventsService, repository } = createService()

				eventsService.getEventById.mockResolvedValue(
					createClubEvent({ canChoose: false, registrationMaximum: 50 }),
				)
				repository.countPlayerSlotsByEventAndStatus.mockResolvedValue(55) // overbooked

				const result = await service.getAvailableSpots(100)

				expect(result).toEqual({ availableSpots: 0, totalSpots: 50 })
			})

			it("returns 0 totalSpots when registrationMaximum is null", async () => {
				const { service, eventsService, repository } = createService()

				eventsService.getEventById.mockResolvedValue(
					createClubEvent({ canChoose: false, registrationMaximum: null }),
				)
				repository.countPlayerSlotsByEventAndStatus.mockResolvedValue(10)

				const result = await service.getAvailableSpots(100)

				expect(result).toEqual({ availableSpots: 0, totalSpots: 0 })
			})
		})
	})
})
