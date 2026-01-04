import {
	EventTypeChoices,
	NotificationTypeChoices,
	RegistrationStatusChoices,
} from "@repo/domain/types"
import type {
	ClubEvent,
	EventFee,
	CreatePaymentRequest,
	UpdatePaymentRequest,
	PaymentDetailRequest,
} from "@repo/domain/types"

import { PaymentNotFoundError } from "../errors/registration.errors"
import { UserPaymentsService } from "../services/user-payments.service"
import type {
	PaymentRow,
	PaymentRowWithDetails,
	PlayerRow,
	RegistrationFeeRow,
	RegistrationSlotRow,
} from "../../database"

// =============================================================================
// Test Fixtures
// =============================================================================

const createPaymentRow = (overrides: Partial<PaymentRow> = {}): PaymentRow => ({
	id: 1,
	paymentCode: "pending",
	paymentKey: null,
	notificationType: null,
	confirmed: 0,
	eventId: 100,
	userId: 10,
	paymentAmount: "50.00",
	transactionFee: "1.75",
	paymentDate: "2025-01-01 00:00:00",
	confirmDate: null,
	...overrides,
})

const createPaymentRowWithDetails = (
	overrides: Partial<PaymentRowWithDetails> = {},
): PaymentRowWithDetails => ({
	...createPaymentRow(),
	paymentDetails: [],
	...overrides,
})

const createRegistrationFeeRow = (
	overrides: Partial<RegistrationFeeRow> = {},
): RegistrationFeeRow => ({
	id: 1,
	isPaid: 0,
	eventFeeId: 1,
	paymentId: 1,
	registrationSlotId: 1,
	amount: "25.00",
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
	isMember: 0,
	lastSeason: null,
	ggId: null,
	userId: 10,
	...overrides,
})

const createEventFee = (overrides: Partial<EventFee> = {}): EventFee => ({
	id: 1,
	eventId: 100,
	amount: 25,
	isRequired: true,
	displayOrder: 1,
	feeTypeId: 1,
	...overrides,
})

const createClubEvent = (overrides: Partial<ClubEvent> = {}): ClubEvent => ({
	id: 100,
	eventType: EventTypeChoices.WEEKNIGHT,
	name: "Test Event",
	registrationType: "M",
	canChoose: true,
	ghinRequired: false,
	startDate: "2025-06-15",
	status: "S",
	season: 2025,
	starterTimeInterval: 10,
	teamSize: 4,
	ageRestrictionType: "N",
	eventFees: [],
	...overrides,
})

const createRegistrationSlotRow = (
	overrides: Partial<RegistrationSlotRow> = {},
): RegistrationSlotRow => ({
	id: 1,
	startingOrder: 0,
	slot: 0,
	status: RegistrationStatusChoices.PENDING,
	eventId: 100,
	holeId: null,
	playerId: 1,
	registrationId: 1,
	ggId: null,
	...overrides,
})

// =============================================================================
// Mock Setup
// =============================================================================

const createMockPaymentsRepository = () => ({
	findPaymentById: jest.fn(),
	createPayment: jest.fn(),
	updatePayment: jest.fn(),
	updatePaymentIntent: jest.fn(),
	deletePaymentDetailsByPayment: jest.fn(),
	createPaymentDetail: jest.fn(),
	findPaymentDetailsByPayment: jest.fn(),
	findPaymentWithDetailsById: jest.fn(),
	deletePayment: jest.fn(),
})

const createMockRegistrationRepository = () => ({
	findPlayerByUserId: jest.fn(),
	findPlayerByEmail: jest.fn(),
	updatePlayer: jest.fn(),
	findSlotsWithStatusByRegistration: jest.fn(),
	updateRegistrationSlots: jest.fn(),
	updateRegistration: jest.fn(),
})

const createMockEventsService = () => ({
	getEventFeesByEventId: jest.fn(),
	getCompleteClubEventById: jest.fn(),
})

const createMockStripeService = () => ({
	createPaymentIntent: jest.fn(),
	createCustomer: jest.fn(),
	createCustomerSession: jest.fn(),
})

const createMockDrizzleService = () => ({
	db: {
		select: jest.fn().mockReturnThis(),
		from: jest.fn().mockReturnThis(),
		where: jest.fn().mockReturnThis(),
		limit: jest.fn().mockResolvedValue([]),
	},
})

function createService() {
	const paymentsRepo = createMockPaymentsRepository()
	const registrationRepo = createMockRegistrationRepository()
	const eventsService = createMockEventsService()
	const stripeService = createMockStripeService()
	const drizzleService = createMockDrizzleService()

	const service = new UserPaymentsService(
		paymentsRepo as any,
		registrationRepo as any,
		eventsService as any,
		stripeService as any,
		drizzleService as any,
	)

	return { service, paymentsRepo, registrationRepo, eventsService, stripeService, drizzleService }
}

// =============================================================================
// Tests
// =============================================================================

describe("UserPaymentsService", () => {
	describe("createPayment", () => {
		it("creates payment with correct subtotal and transaction fee", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()

			const paymentDetails: PaymentDetailRequest[] = [
				{ eventFeeId: 1, registrationSlotId: 1, amount: 25 },
				{ eventFeeId: 2, registrationSlotId: 1, amount: 15 },
			]

			eventsService.getEventFeesByEventId.mockResolvedValue([
				createEventFee({ id: 1, isRequired: true }),
				createEventFee({ id: 2, isRequired: false }),
			])
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			paymentsRepo.createPayment.mockResolvedValue(1)
			paymentsRepo.createPaymentDetail.mockResolvedValue(1)
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(
				createPaymentRowWithDetails({
					paymentAmount: "40.00",
					transactionFee: "1.46",
					paymentDetails: [
						createRegistrationFeeRow({ amount: "25.00" }),
						createRegistrationFeeRow({ id: 2, amount: "15.00" }),
					],
				}),
			)

			const request: CreatePaymentRequest = {
				eventId: 100,
				userId: 10,
				eventType: EventTypeChoices.WEEKNIGHT,
				paymentDetails,
			}

			await service.createPayment(request)

			// Subtotal = 40, transaction fee = 40 * 0.029 + 0.30 = 1.46
			expect(paymentsRepo.createPayment).toHaveBeenCalledWith(
				expect.objectContaining({
					paymentAmount: "40.00",
					transactionFee: "1.46",
				}),
			)
		})

		it("creates payment detail for each fee", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()

			eventsService.getEventFeesByEventId.mockResolvedValue([createEventFee()])
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			paymentsRepo.createPayment.mockResolvedValue(1)
			paymentsRepo.createPaymentDetail.mockResolvedValue(1)
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(createPaymentRowWithDetails())

			const request: CreatePaymentRequest = {
				eventId: 100,
				userId: 10,
				eventType: EventTypeChoices.WEEKNIGHT,
				paymentDetails: [
					{ eventFeeId: 1, registrationSlotId: 1, amount: 25 },
					{ eventFeeId: 2, registrationSlotId: 2, amount: 15 },
				],
			}

			await service.createPayment(request)

			expect(paymentsRepo.createPaymentDetail).toHaveBeenCalledTimes(2)
		})

		it("derives notification type as RETURNING_MEMBER for season registration with returning player", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()
			const currentYear = new Date().getFullYear()

			eventsService.getEventFeesByEventId.mockResolvedValue([createEventFee({ isRequired: true })])
			registrationRepo.findPlayerByUserId.mockResolvedValue(
				createPlayerRow({ lastSeason: currentYear - 1 }),
			)
			paymentsRepo.createPayment.mockResolvedValue(1)
			paymentsRepo.createPaymentDetail.mockResolvedValue(1)
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(createPaymentRowWithDetails())

			const request: CreatePaymentRequest = {
				eventId: 100,
				userId: 10,
				eventType: EventTypeChoices.SEASON_REGISTRATION,
				paymentDetails: [{ eventFeeId: 1, registrationSlotId: 1, amount: 100 }],
			}

			await service.createPayment(request)

			expect(paymentsRepo.createPayment).toHaveBeenCalledWith(
				expect.objectContaining({
					notificationType: NotificationTypeChoices.RETURNING_MEMBER,
				}),
			)
		})

		it("derives notification type as NEW_MEMBER for season registration with new player", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()

			eventsService.getEventFeesByEventId.mockResolvedValue([createEventFee({ isRequired: true })])
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow({ lastSeason: null }))
			paymentsRepo.createPayment.mockResolvedValue(1)
			paymentsRepo.createPaymentDetail.mockResolvedValue(1)
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(createPaymentRowWithDetails())

			const request: CreatePaymentRequest = {
				eventId: 100,
				userId: 10,
				eventType: EventTypeChoices.SEASON_REGISTRATION,
				paymentDetails: [{ eventFeeId: 1, registrationSlotId: 1, amount: 100 }],
			}

			await service.createPayment(request)

			expect(paymentsRepo.createPayment).toHaveBeenCalledWith(
				expect.objectContaining({
					notificationType: NotificationTypeChoices.NEW_MEMBER,
				}),
			)
		})

		it("derives notification type as SIGNUP_CONFIRMATION when has required fees", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()

			eventsService.getEventFeesByEventId.mockResolvedValue([
				createEventFee({ id: 1, isRequired: true }),
			])
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			paymentsRepo.createPayment.mockResolvedValue(1)
			paymentsRepo.createPaymentDetail.mockResolvedValue(1)
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(createPaymentRowWithDetails())

			const request: CreatePaymentRequest = {
				eventId: 100,
				userId: 10,
				eventType: EventTypeChoices.WEEKNIGHT,
				paymentDetails: [{ eventFeeId: 1, registrationSlotId: 1, amount: 25 }],
			}

			await service.createPayment(request)

			expect(paymentsRepo.createPayment).toHaveBeenCalledWith(
				expect.objectContaining({
					notificationType: NotificationTypeChoices.SIGNUP_CONFIRMATION,
				}),
			)
		})

		it("derives notification type as UPDATED_REGISTRATION when no required fees", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()

			eventsService.getEventFeesByEventId.mockResolvedValue([
				createEventFee({ id: 1, isRequired: true }),
				createEventFee({ id: 2, isRequired: false }),
			])
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			paymentsRepo.createPayment.mockResolvedValue(1)
			paymentsRepo.createPaymentDetail.mockResolvedValue(1)
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(createPaymentRowWithDetails())

			// Only selecting optional fee (id: 2)
			const request: CreatePaymentRequest = {
				eventId: 100,
				userId: 10,
				eventType: EventTypeChoices.WEEKNIGHT,
				paymentDetails: [{ eventFeeId: 2, registrationSlotId: 1, amount: 15 }],
			}

			await service.createPayment(request)

			expect(paymentsRepo.createPayment).toHaveBeenCalledWith(
				expect.objectContaining({
					notificationType: NotificationTypeChoices.UPDATED_REGISTRATION,
				}),
			)
		})
	})

	describe("updatePayment", () => {
		it("throws PaymentNotFoundError when payment does not exist", async () => {
			const { service, paymentsRepo } = createService()
			paymentsRepo.findPaymentById.mockResolvedValue(null)

			const request: UpdatePaymentRequest = {
				eventId: 100,
				userId: 10,
				paymentDetails: [],
			}

			await expect(service.updatePayment(999, request)).rejects.toThrow(PaymentNotFoundError)
		})

		it("deletes existing payment details before creating new ones", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()

			const callOrder: string[] = []
			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.deletePaymentDetailsByPayment.mockImplementation(() => {
				callOrder.push("delete")
			})
			paymentsRepo.updatePayment.mockResolvedValue(undefined)
			paymentsRepo.createPaymentDetail.mockImplementation(() => {
				callOrder.push("create")
				return 1
			})
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(createPaymentRowWithDetails())
			eventsService.getCompleteClubEventById.mockResolvedValue(
				createClubEvent({ eventFees: [createEventFee()] }),
			)
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())

			const request: UpdatePaymentRequest = {
				eventId: 100,
				userId: 10,
				paymentDetails: [{ eventFeeId: 1, registrationSlotId: 1, amount: 25 }],
			}

			await service.updatePayment(1, request)

			expect(paymentsRepo.deletePaymentDetailsByPayment).toHaveBeenCalledWith(1)
			expect(callOrder[0]).toBe("delete")
			expect(callOrder[1]).toBe("create")
		})

		it("updates payment with recalculated amounts", async () => {
			const { service, paymentsRepo, registrationRepo, eventsService } = createService()

			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.deletePaymentDetailsByPayment.mockResolvedValue(undefined)
			paymentsRepo.updatePayment.mockResolvedValue(undefined)
			paymentsRepo.createPaymentDetail.mockResolvedValue(1)
			paymentsRepo.findPaymentWithDetailsById.mockResolvedValue(createPaymentRowWithDetails())
			eventsService.getCompleteClubEventById.mockResolvedValue(
				createClubEvent({ eventFees: [createEventFee()] }),
			)
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())

			const request: UpdatePaymentRequest = {
				eventId: 100,
				userId: 10,
				paymentDetails: [{ eventFeeId: 1, registrationSlotId: 1, amount: 50 }],
			}

			await service.updatePayment(1, request)

			// Subtotal = 50, transaction fee = 50 * 0.029 + 0.30 = 1.75
			expect(paymentsRepo.updatePayment).toHaveBeenCalledWith(
				1,
				expect.objectContaining({
					paymentAmount: "50.00",
					transactionFee: "1.75",
				}),
			)
		})
	})

	describe("createPaymentIntent", () => {
		it("throws PaymentNotFoundError when payment does not exist", async () => {
			const { service, paymentsRepo } = createService()
			paymentsRepo.findPaymentById.mockResolvedValue(null)

			await expect(service.createPaymentIntent(999, 100, 1)).rejects.toThrow(PaymentNotFoundError)
		})

		it("converts dollar amount to cents correctly", async () => {
			const {
				service,
				paymentsRepo,
				eventsService,
				registrationRepo,
				stripeService,
				drizzleService,
			} = createService()

			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.findPaymentDetailsByPayment.mockResolvedValue([
				createRegistrationFeeRow({ amount: "100.00" }),
			])
			paymentsRepo.updatePayment.mockResolvedValue(undefined)
			paymentsRepo.updatePaymentIntent.mockResolvedValue(undefined)
			eventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue([])
			drizzleService.db.limit.mockResolvedValue([
				{ firstName: "John", lastName: "Doe", email: "john@example.com" },
			])
			stripeService.createPaymentIntent.mockResolvedValue({
				id: "pi_test",
				client_secret: "pi_test_secret",
			})

			await service.createPaymentIntent(1, 100, 1)

			// $100 subtotal + $3.20 fee = $103.20 = 10320 cents
			expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
				10320,
				expect.any(String),
				expect.any(Object),
				undefined,
				"john@example.com",
			)
		})

		it("uses existing Stripe customer ID when present", async () => {
			const {
				service,
				paymentsRepo,
				eventsService,
				registrationRepo,
				stripeService,
				drizzleService,
			} = createService()

			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.findPaymentDetailsByPayment.mockResolvedValue([
				createRegistrationFeeRow({ amount: "25.00" }),
			])
			paymentsRepo.updatePayment.mockResolvedValue(undefined)
			paymentsRepo.updatePaymentIntent.mockResolvedValue(undefined)
			eventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())
			registrationRepo.findPlayerByUserId.mockResolvedValue(
				createPlayerRow({ stripeCustomerId: "cus_existing" }),
			)
			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue([])
			drizzleService.db.limit.mockResolvedValue([
				{ firstName: "John", lastName: "Doe", email: "john@example.com" },
			])
			stripeService.createPaymentIntent.mockResolvedValue({
				id: "pi_test",
				client_secret: "pi_test_secret",
			})

			await service.createPaymentIntent(1, 100, 1)

			expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
				expect.any(Number),
				expect.any(String),
				expect.any(Object),
				"cus_existing",
				"john@example.com",
			)
		})

		it("stores payment intent ID and client secret", async () => {
			const {
				service,
				paymentsRepo,
				eventsService,
				registrationRepo,
				stripeService,
				drizzleService,
			} = createService()

			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.findPaymentDetailsByPayment.mockResolvedValue([
				createRegistrationFeeRow({ amount: "25.00" }),
			])
			paymentsRepo.updatePayment.mockResolvedValue(undefined)
			paymentsRepo.updatePaymentIntent.mockResolvedValue(undefined)
			eventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue([])
			drizzleService.db.limit.mockResolvedValue([
				{ firstName: "John", lastName: "Doe", email: "john@example.com" },
			])
			stripeService.createPaymentIntent.mockResolvedValue({
				id: "pi_12345",
				client_secret: "pi_12345_secret_abc",
			})

			await service.createPaymentIntent(1, 100, 1)

			expect(paymentsRepo.updatePaymentIntent).toHaveBeenCalledWith(
				1,
				"pi_12345",
				"pi_12345_secret_abc",
			)
		})

		it("falls back to Unknown when user not found", async () => {
			const {
				service,
				paymentsRepo,
				eventsService,
				registrationRepo,
				stripeService,
				drizzleService,
			} = createService()

			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.findPaymentDetailsByPayment.mockResolvedValue([
				createRegistrationFeeRow({ amount: "25.00" }),
			])
			paymentsRepo.updatePayment.mockResolvedValue(undefined)
			paymentsRepo.updatePaymentIntent.mockResolvedValue(undefined)
			eventsService.getCompleteClubEventById.mockResolvedValue(
				createClubEvent({ name: "Weekly Event" }),
			)
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue([])
			drizzleService.db.limit.mockResolvedValue([]) // No user found
			stripeService.createPaymentIntent.mockResolvedValue({
				id: "pi_test",
				client_secret: "pi_test_secret",
			})

			await service.createPaymentIntent(1, 100, 1)

			expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
				expect.any(Number),
				expect.stringContaining("Unknown"),
				expect.any(Object),
				undefined,
				undefined,
			)
		})

		it("transitions registration slots from PENDING to AWAITING_PAYMENT", async () => {
			const {
				service,
				paymentsRepo,
				eventsService,
				registrationRepo,
				stripeService,
				drizzleService,
			} = createService()

			const pendingSlots = [
				createRegistrationSlotRow({ id: 1, status: RegistrationStatusChoices.PENDING }),
				createRegistrationSlotRow({ id: 2, status: RegistrationStatusChoices.PENDING }),
			]

			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.findPaymentDetailsByPayment.mockResolvedValue([
				createRegistrationFeeRow({ amount: "25.00" }),
			])
			paymentsRepo.updatePayment.mockResolvedValue(undefined)
			paymentsRepo.updatePaymentIntent.mockResolvedValue(undefined)
			eventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())
			registrationRepo.findPlayerByUserId.mockResolvedValue(createPlayerRow())
			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue(pendingSlots)
			registrationRepo.updateRegistrationSlots.mockResolvedValue(undefined)
			registrationRepo.updateRegistration.mockResolvedValue(undefined)
			drizzleService.db.limit.mockResolvedValue([
				{ firstName: "John", lastName: "Doe", email: "john@example.com" },
			])
			stripeService.createPaymentIntent.mockResolvedValue({
				id: "pi_test",
				client_secret: "pi_test_secret",
			})

			await service.createPaymentIntent(1, 100, 1)

			expect(registrationRepo.updateRegistrationSlots).toHaveBeenCalledWith([1, 2], {
				status: RegistrationStatusChoices.AWAITING_PAYMENT,
			})
		})
	})

	describe("getStripeAmount", () => {
		it("throws PaymentNotFoundError when payment does not exist", async () => {
			const { service, paymentsRepo } = createService()
			paymentsRepo.findPaymentById.mockResolvedValue(null)

			await expect(service.getStripeAmount(999)).rejects.toThrow(PaymentNotFoundError)
		})

		it("returns 0 cents for empty payment details", async () => {
			const { service, paymentsRepo } = createService()
			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.findPaymentDetailsByPayment.mockResolvedValue([])

			const result = await service.getStripeAmount(1)

			expect(result.amountCents).toBe(0)
			expect(result.amountDue.subtotal).toBe(0)
		})

		it("calculates correct cents value with transaction fee", async () => {
			const { service, paymentsRepo } = createService()
			paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
			paymentsRepo.findPaymentDetailsByPayment.mockResolvedValue([
				createRegistrationFeeRow({ amount: "50.00" }),
				createRegistrationFeeRow({ id: 2, amount: "25.00" }),
			])

			const result = await service.getStripeAmount(1)

			// Subtotal = 75, fee = 75 * 0.029 + 0.30 = 2.475 ≈ 2.48
			// Total = 75 + 2.48 = 77.48 → 7748 cents
			expect(result.amountDue.subtotal).toBe(75)
			expect(result.amountCents).toBe(7748)
		})
	})

	describe("createCustomerSession", () => {
		it("throws Error when player not found by email", async () => {
			const { service, registrationRepo } = createService()
			registrationRepo.findPlayerByEmail.mockResolvedValue(null)

			await expect(service.createCustomerSession("unknown@example.com")).rejects.toThrow(
				"No player found with email unknown@example.com",
			)
		})

		it("creates new Stripe customer when player has none", async () => {
			const { service, registrationRepo, stripeService } = createService()

			registrationRepo.findPlayerByEmail.mockResolvedValue(
				createPlayerRow({ stripeCustomerId: null }),
			)
			registrationRepo.updatePlayer.mockResolvedValue(createPlayerRow())
			stripeService.createCustomer.mockResolvedValue("cus_new123")
			stripeService.createCustomerSession.mockResolvedValue("cs_secret")

			const result = await service.createCustomerSession("john@example.com")

			expect(stripeService.createCustomer).toHaveBeenCalledWith("john@example.com", "John Doe")
			expect(registrationRepo.updatePlayer).toHaveBeenCalledWith(1, {
				stripeCustomerId: "cus_new123",
			})
			expect(result.customerId).toBe("cus_new123")
		})

		it("uses existing Stripe customer ID without creating new one", async () => {
			const { service, registrationRepo, stripeService } = createService()

			registrationRepo.findPlayerByEmail.mockResolvedValue(
				createPlayerRow({ stripeCustomerId: "cus_existing" }),
			)
			stripeService.createCustomerSession.mockResolvedValue("cs_secret")

			const result = await service.createCustomerSession("john@example.com")

			expect(stripeService.createCustomer).not.toHaveBeenCalled()
			expect(registrationRepo.updatePlayer).not.toHaveBeenCalled()
			expect(result.customerId).toBe("cus_existing")
		})

		it("returns both client secret and customer ID", async () => {
			const { service, registrationRepo, stripeService } = createService()

			registrationRepo.findPlayerByEmail.mockResolvedValue(
				createPlayerRow({ stripeCustomerId: "cus_test" }),
			)
			stripeService.createCustomerSession.mockResolvedValue("cs_test_secret")

			const result = await service.createCustomerSession("john@example.com")

			expect(result).toEqual({
				clientSecret: "cs_test_secret",
				customerId: "cus_test",
			})
		})
	})

	describe("paymentProcessing", () => {
		it("returns early when no pending slots exist", async () => {
			const { service, registrationRepo } = createService()
			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue([])

			await service.paymentProcessing(1)

			expect(registrationRepo.updateRegistrationSlots).not.toHaveBeenCalled()
			expect(registrationRepo.updateRegistration).not.toHaveBeenCalled()
		})

		it("updates all pending slots to AWAITING_PAYMENT status", async () => {
			const { service, registrationRepo } = createService()

			const pendingSlots = [
				createRegistrationSlotRow({ id: 1 }),
				createRegistrationSlotRow({ id: 2 }),
				createRegistrationSlotRow({ id: 3 }),
			]

			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue(pendingSlots)
			registrationRepo.updateRegistrationSlots.mockResolvedValue(undefined)
			registrationRepo.updateRegistration.mockResolvedValue(undefined)

			await service.paymentProcessing(1)

			expect(registrationRepo.updateRegistrationSlots).toHaveBeenCalledWith([1, 2, 3], {
				status: RegistrationStatusChoices.AWAITING_PAYMENT,
			})
		})

		it("clears registration expiry date", async () => {
			const { service, registrationRepo } = createService()

			registrationRepo.findSlotsWithStatusByRegistration.mockResolvedValue([
				createRegistrationSlotRow(),
			])
			registrationRepo.updateRegistrationSlots.mockResolvedValue(undefined)
			registrationRepo.updateRegistration.mockResolvedValue(undefined)

			await service.paymentProcessing(1)

			expect(registrationRepo.updateRegistration).toHaveBeenCalledWith(1, { expires: null })
		})
	})
})
