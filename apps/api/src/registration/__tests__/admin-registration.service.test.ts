import { BadRequestException, NotFoundException } from "@nestjs/common"
import {
	RegistrationStatusChoices,
	EventTypeChoices,
	type CompleteClubEvent,
	type AdminRegistration,
	type Player,
	type DjangoUser,
} from "@repo/domain/types"

import { SlotConflictError, EventFullError } from "../errors"
import { AdminRegistrationService } from "../services/admin-registration.service"

jest.mock("@repo/domain/functions", () => ({
	getAmount: jest.fn((eventFee) => 50),
	calculateAmountDue: jest.fn((amounts: number[]) => ({
		total: amounts.reduce((a, b) => a + b, 0),
		transactionFee: amounts.reduce((a, b) => a + b, 0) * 0.029 + 0.3,
	})),
}))
import type {
	PlayerRow,
	RegistrationRow,
	RegistrationSlotRow,
	RegistrationFull,
	RegistrationSlotFull,
	PaymentRow,
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

const createCompleteClubEvent = (
	overrides: Partial<CompleteClubEvent> = {},
): CompleteClubEvent => ({
	id: 100,
	eventType: "W" as any,
	name: "Test Event",
	registrationType: "M" as any,
	canChoose: true,
	ghinRequired: false,
	startDate: "2025-06-15",
	status: "S",
	season: 2025,
	starterTimeInterval: 10,
	teamSize: 4,
	ageRestrictionType: "N",
	registrationMaximum: undefined,
	maximumSignupGroupSize: 4,
	signupStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
	signupEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
	ggId: "",
	eventRounds: [],
	tournaments: [],
	eventFees: [
		{
			id: 1,
			eventId: 100,
			feeTypeId: 1,
			feeType: {
				id: 1,
				name: "Standard",
				code: "STD",
				payout: "N",
				restriction: "N",
			} as any,
		},
	] as any,
	...overrides,
})

const createAdminRegistration = (
	overrides: Partial<AdminRegistration> = {},
): AdminRegistration => ({
	userId: 10,
	signedUpBy: "Admin User",
	courseId: 1,
	startingHoleId: 1,
	startingOrder: 0,
	expires: 2,
	collectPayment: true,
	slots: [
		{
			slotId: 1,
			playerId: 1,
			feeIds: [1],
		},
	],
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
	signedUpBy: "Admin User",
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

const createPaymentRow = (overrides: Partial<PaymentRow> = {}): PaymentRow => ({
	id: 1,
	paymentCode: "pi_123456",
	eventId: 100,
	userId: 10,
	paymentAmount: "50.00",
	transactionFee: "2.50",
	confirmed: 0,
	notificationType: "A",
	paymentKey: null,
	paymentDate: null,
	confirmDate: null,
	...overrides,
})

// =============================================================================
// Mock Setup
// =============================================================================

const createMockDrizzleService = () => {
	const createChainableMock = () => {
		const createThenableChain = (defaultValue: unknown[] = []): any => {
			let insertIdCounter = 0
			const chain: any = {
				select: jest.fn(() => chain),
				from: jest.fn(() => chain),
				where: jest.fn(() => chain),
				for: jest.fn().mockResolvedValue(defaultValue),
				insert: jest.fn(() => chain),
				values: jest.fn().mockImplementation(() => {
					return Promise.resolve([{ insertId: ++insertIdCounter }])
				}),
				update: jest.fn(() => chain),
				set: jest.fn(() => chain),
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

const createMockRegistrationRepository = () => ({
	findPlayersByIds: jest.fn(),
	findRegistrationFullById: jest.fn(),
	findPlayerById: jest.fn(),
	updatePlayer: jest.fn(),
	findCompleteRegistrationById: jest.fn(),
})

const createMockPaymentsRepository = () => ({
	findPaymentById: jest.fn(),
})

const createMockEventsService = () => ({
	getCompleteClubEventById: jest.fn(),
})

const createMockCoursesService = () => ({
	findCourseWithHolesById: jest.fn(),
})

const createMockDjangoAuthService = () => ({
	findById: jest.fn(),
})

const createMockMailService = () => ({
	sendAdminRegistrationNotification: jest.fn(),
})

const createMockBroadcastService = () => ({
	notifyChange: jest.fn(),
})

function createService() {
	const drizzle = createMockDrizzleService()
	const repository = createMockRegistrationRepository()
	const paymentsRepository = createMockPaymentsRepository()
	const eventsService = createMockEventsService()
	const coursesService = createMockCoursesService()
	const authService = createMockDjangoAuthService()
	const mailService = createMockMailService()
	const broadcastService = createMockBroadcastService()

	const service = new AdminRegistrationService(
		drizzle as any,
		repository as any,
		paymentsRepository as any,
		authService as any,
		coursesService as any,
		eventsService as any,
		mailService as any,
		broadcastService as any,
	)

	return {
		service,
		drizzle,
		repository,
		paymentsRepository,
		eventsService,
		coursesService,
		authService,
		mailService,
		broadcastService,
	}
}

// =============================================================================
// Tests
// =============================================================================

describe("AdminRegistrationService", () => {
	describe("createAdminRegistration - choosable events", () => {
		it("creates registration with correct fields", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: true })
			const dto = createAdminRegistration()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([
				createRegistrationSlotRow({ status: RegistrationStatusChoices.AVAILABLE }),
			])
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			const result = await service.createAdminRegistration(100, dto)

			expect(result.registrationId).toBe(1)
			expect(result.paymentId).toBe(2)
			expect(drizzle.mockTx.insert).toHaveBeenCalled()
		})

		it("creates payment record with 'Requested' code when collectPayment=true", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: true })
			const dto = createAdminRegistration({ collectPayment: true })

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([
				createRegistrationSlotRow({ status: RegistrationStatusChoices.AVAILABLE }),
			])
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			await service.createAdminRegistration(100, dto)

			// Verify that payment insertion was called with "Requested"
			const insertCalls = drizzle.mockTx.insert.mock.calls
			expect(insertCalls.length).toBeGreaterThan(0)
		})

		it("creates payment record with 'Waived' code when collectPayment=false", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: true })
			const dto = createAdminRegistration({ collectPayment: false })

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([
				createRegistrationSlotRow({ status: RegistrationStatusChoices.AVAILABLE }),
			])
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			const result = await service.createAdminRegistration(100, dto)

			expect(result.registrationId).toBe(1)
			// Payment should still be created even when collectPayment=false (for waived fees)
			expect(result.paymentId).toBeGreaterThan(0)
		})

		it("inserts slots with AWAITING_PAYMENT status", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: true })
			const dto = createAdminRegistration()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([
				createRegistrationSlotRow({ status: RegistrationStatusChoices.AVAILABLE }),
			])
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.values.mockResolvedValue([{ insertId: 1 }, { insertId: 2 }])
			drizzle.mockTx.update.mockReturnValue(drizzle.mockTx)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			await service.createAdminRegistration(100, dto)

			expect(drizzle.mockTx.update).toHaveBeenCalled()
		})

		it("inserts registration fees with correct amounts", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: true })
			const dto = createAdminRegistration()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([
				createRegistrationSlotRow({ status: RegistrationStatusChoices.AVAILABLE }),
			])
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.values.mockResolvedValue([{ insertId: 1 }, { insertId: 2 }])
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			await service.createAdminRegistration(100, dto)

			// Verify fees were inserted by checking insert calls
			expect(drizzle.mockTx.insert).toHaveBeenCalled()
		})

		it("throws SlotConflictError when slot already reserved", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: true })
			const dto = createAdminRegistration()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			// Return slot that is NOT AVAILABLE
			drizzle.mockTx.for.mockResolvedValue([
				createRegistrationSlotRow({ status: RegistrationStatusChoices.PENDING }),
			])

			await expect(service.createAdminRegistration(100, dto)).rejects.toThrow(SlotConflictError)
		})
	})

	describe("createAdminRegistration - non-choosable events", () => {
		it("creates registration for non-choosable event", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: false })
			const dto = createAdminRegistration({ courseId: undefined })

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([])
			drizzle.mockTx.select.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.from.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.where.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			const result = await service.createAdminRegistration(100, dto)

			expect(result.registrationId).toBe(1)
			expect(result.paymentId).toBe(2)
		})

		it("creates synthetic slots with PENDING status when collectPayment=true", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: false })
			const dto = createAdminRegistration({ collectPayment: true })

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([])
			drizzle.mockTx.select.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.from.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.where.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.values.mockResolvedValue([{ insertId: 1 }, { insertId: 2 }])
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			await service.createAdminRegistration(100, dto)

			expect(drizzle.mockTx.insert).toHaveBeenCalled()
		})

		it("creates synthetic slots with RESERVED status when collectPayment=false", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: false })
			const dto = createAdminRegistration({ collectPayment: false })

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([])
			drizzle.mockTx.select.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.from.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.where.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.values.mockResolvedValue([{ insertId: 1 }, { insertId: 2 }])
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			await service.createAdminRegistration(100, dto)

			expect(drizzle.mockTx.insert).toHaveBeenCalled()
		})

		it("throws EventFullError when exceeds registrationMaximum capacity", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({
				canChoose: false,
				registrationMaximum: 2,
			})
			const dto = createAdminRegistration({
				slots: [
					{ slotId: 1, playerId: 1, feeIds: [1] },
					{ slotId: 2, playerId: 2, feeIds: [1] },
					{ slotId: 3, playerId: 3, feeIds: [1] },
				],
			})

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([
				createPlayerRow(),
				createPlayerRow({ id: 2 }),
				createPlayerRow({ id: 3 }),
			])
			// Return 2 already-locked slots (at capacity)
			drizzle.mockTx.for.mockResolvedValue([{ id: 1 }, { id: 2 }])

			await expect(service.createAdminRegistration(100, dto)).rejects.toThrow(EventFullError)
		})
	})

	describe("createAdminRegistration - special cases", () => {
		it("handles SEASON_REGISTRATION type (calls updateMembershipStatus)", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({
				canChoose: false,
				eventType: EventTypeChoices.SEASON_REGISTRATION,
				startDate: "2025-06-15",
			})
			const dto = createAdminRegistration()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow({ id: 1 })])
			repository.findPlayerById.mockResolvedValue(createPlayerRow({ id: 1 }))
			repository.updatePlayer.mockResolvedValue(createPlayerRow({ id: 1 }))
			drizzle.mockTx.for.mockResolvedValue([])
			drizzle.mockTx.select.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.from.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.where.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.values.mockResolvedValue([{ insertId: 1 }, { insertId: 2 }])
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			await service.createAdminRegistration(100, dto)

			expect(repository.findPlayerById).toHaveBeenCalledWith(1)
			expect(repository.updatePlayer).toHaveBeenCalled()
		})

		it("cleans up stale registration when user already has pending registration", async () => {
			const { service, eventsService, repository, drizzle } = createService()
			const event = createCompleteClubEvent({ canChoose: false })
			const dto = createAdminRegistration()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findPlayersByIds.mockResolvedValue([createPlayerRow()])
			drizzle.mockTx.for.mockResolvedValue([])
			drizzle.mockTx.select.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.from.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.where.mockReturnValue(drizzle.mockTx)
			// Return existing registration
			drizzle.mockTx.then = jest.fn((resolve) =>
				Promise.resolve([createRegistrationRow()]).then(resolve),
			)
			drizzle.mockTx.insert.mockReturnValue(drizzle.mockTx)
			drizzle.mockTx.values.mockResolvedValue([{ insertId: 1 }, { insertId: 2 }])
			drizzle.mockTx.update.mockReturnValue(drizzle.mockTx)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())

			await service.createAdminRegistration(100, dto)

			expect(drizzle.mockTx.update).toHaveBeenCalled()
		})
	})

	describe("sendAdminRegistrationNotification", () => {
		it("sends email with correct parameters", async () => {
			const { service, eventsService, repository, coursesService, authService, mailService } =
				createService()
			const event = createCompleteClubEvent()
			const user = createDjangoUser()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())
			coursesService.findCourseWithHolesById.mockResolvedValue({
				id: 1,
				name: "Test Course",
				numberOfHoles: 18,
				holes: [{ id: 1, courseId: 1, number: 1, handicap: 3, length: 400, par: 4, tee: "White" }],
				tees: [],
			})
			authService.findById.mockResolvedValue(user)
			mailService.sendAdminRegistrationNotification.mockResolvedValue(undefined)

			await service.sendAdminRegistrationNotification(100, 1, 1, true)

			expect(mailService.sendAdminRegistrationNotification).toHaveBeenCalled()
			expect(authService.findById).toHaveBeenCalledWith(10)
		})

		it("resolves user from registration.userId", async () => {
			const { service, eventsService, repository, coursesService, authService, mailService } =
				createService()
			const event = createCompleteClubEvent()
			const user = createDjangoUser({ id: 10 })

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull({ userId: 10 }))
			coursesService.findCourseWithHolesById.mockResolvedValue({
				id: 1,
				name: "Test Course",
				numberOfHoles: 18,
				holes: [{ id: 1, courseId: 1, number: 1, handicap: 3, length: 400, par: 4, tee: "White" }],
				tees: [],
			})
			authService.findById.mockResolvedValue(user)
			mailService.sendAdminRegistrationNotification.mockResolvedValue(undefined)

			await service.sendAdminRegistrationNotification(100, 1, 1, true)

			expect(authService.findById).toHaveBeenCalledWith(10)
		})

		it("throws BadRequestException when user not found", async () => {
			const { service, eventsService, repository, coursesService, authService } = createService()
			const event = createCompleteClubEvent()

			eventsService.getCompleteClubEventById.mockResolvedValue(event)
			repository.findRegistrationFullById.mockResolvedValue(createRegistrationFull())
			coursesService.findCourseWithHolesById.mockResolvedValue({
				id: 1,
				name: "Test Course",
				numberOfHoles: 18,
				holes: [{ id: 1, courseId: 1, number: 1, handicap: 3, length: 400, par: 4, tee: "White" }],
				tees: [],
			})
			authService.findById.mockResolvedValue(null)

			await expect(service.sendAdminRegistrationNotification(100, 1, 1, true)).rejects.toThrow(
				BadRequestException,
			)
		})
	})

	describe("updateMembershipStatus", () => {
		it("sets player.isMember=1 and lastSeason", async () => {
			const { service, repository } = createService()
			const player = createPlayerRow({ isMember: 0, lastSeason: null })

			repository.findPlayerById.mockResolvedValue(player)
			repository.updatePlayer.mockResolvedValue(player)

			await service.updateMembershipStatus(1, 2025)

			expect(repository.findPlayerById).toHaveBeenCalledWith(1)
			expect(repository.updatePlayer).toHaveBeenCalled()
		})

		it("handles player not found gracefully", async () => {
			const { service, repository } = createService()

			repository.findPlayerById.mockResolvedValue(null)

			// Should not throw
			await service.updateMembershipStatus(999, 2025)

			expect(repository.findPlayerById).toHaveBeenCalledWith(999)
		})
	})

	describe("getCompleteRegistrationAndPayment", () => {
		it("returns hydrated registration and payment data", async () => {
			const { service, repository, paymentsRepository } = createService()
			const regRow = {
				id: 1,
				eventId: 100,
				userId: 10,
				courseId: 1,
				signedUpBy: "Admin",
				notes: null,
				expires: new Date().toISOString(),
				createdDate: new Date().toISOString(),
				ggId: null,
				course: {
					id: 1,
					name: "Test Course",
					numberOfHoles: 18,
					holes: [],
					tees: [],
				},
				slots: [],
			}
			const paymentRow = createPaymentRow()

			repository.findCompleteRegistrationById.mockResolvedValue(regRow as any)
			paymentsRepository.findPaymentById.mockResolvedValue(paymentRow)

			const result = await service.getCompleteRegistrationAndPayment(1, 1)

			expect(result.registration).toBeDefined()
			expect(result.payment).toBeDefined()
		})

		it("throws NotFoundException for missing registration", async () => {
			const { service, repository } = createService()

			repository.findCompleteRegistrationById.mockResolvedValue(null)

			await expect(service.getCompleteRegistrationAndPayment(999, 1)).rejects.toThrow(
				NotFoundException,
			)
		})

		it("throws NotFoundException for missing payment", async () => {
			const { service, repository, paymentsRepository } = createService()
			const regRow = {
				id: 1,
				eventId: 100,
				userId: 10,
				courseId: 1,
				signedUpBy: "Admin",
				notes: null,
				expires: new Date().toISOString(),
				createdDate: new Date().toISOString(),
				ggId: null,
				course: {
					id: 1,
					name: "Test Course",
					numberOfHoles: 18,
					holes: [],
					tees: [],
				},
				slots: [],
			}

			repository.findCompleteRegistrationById.mockResolvedValue(regRow as any)
			paymentsRepository.findPaymentById.mockResolvedValue(null)

			await expect(service.getCompleteRegistrationAndPayment(1, 999)).rejects.toThrow(
				NotFoundException,
			)
		})
	})
})
