import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common"

import { EventTypeChoices } from "@repo/domain/types"
import type { ClubEvent } from "@repo/domain/types"

import type { PaymentRow, RegistrationRow } from "../../database"
import { PaymentsService } from "../services/payments.service"

// =============================================================================
// Test Fixtures
// =============================================================================

const createPaymentRow = (overrides: Partial<PaymentRow> = {}): PaymentRow => ({
	id: 1,
	paymentCode: "Requested",
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

const createRegistrationRow = (overrides: Partial<RegistrationRow> = {}): RegistrationRow => ({
	id: 1,
	eventId: 100,
	userId: 10,
	courseId: 1,
	signedUpBy: "Admin",
	notes: null,
	expires: "2099-12-31 23:59:59",
	ggId: null,
	createdDate: "2025-06-01 08:00:00",
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

// =============================================================================
// Mock Setup
// =============================================================================

const createMockPaymentsRepository = () => ({
	findPaymentById: jest.fn(),
	findPaymentsForRegistration: jest.fn(),
	createPayment: jest.fn(),
	updatePayment: jest.fn(),
	updatePaymentIntent: jest.fn(),
	deletePaymentDetailsByPayment: jest.fn(),
	createPaymentDetail: jest.fn(),
	findPaymentDetailsByPayment: jest.fn(),
	findPaymentWithDetailsById: jest.fn(),
	deletePayment: jest.fn(),
	updatePaymentDetailStatus: jest.fn(),
	findByPaymentCode: jest.fn(),
	findPaidFeesBySlotIds: jest.fn(),
})

const createMockRegistrationRepository = () => ({
	findPlayerByUserId: jest.fn(),
	findPlayerByEmail: jest.fn(),
	updatePlayer: jest.fn(),
	findSlotsWithStatusByRegistration: jest.fn(),
	updateRegistrationSlots: jest.fn(),
	updateRegistration: jest.fn(),
	findRegistrationById: jest.fn(),
	findRegistrationSlotsByRegistrationId: jest.fn(),
})

const createMockEventsService = () => ({
	getEventFeesByEventId: jest.fn(),
	getCompleteClubEventById: jest.fn(),
	getEventById: jest.fn(),
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

const createMockBroadcastService = () => ({
	notifyChange: jest.fn(),
})

const createMockSlotCleanupService = () => ({
	releaseSlots: jest.fn(),
	releaseSlotsByRegistration: jest.fn(),
})

function createService() {
	const paymentsRepo = createMockPaymentsRepository()
	const registrationRepo = createMockRegistrationRepository()
	const eventsService = createMockEventsService()
	const stripeService = createMockStripeService()
	const drizzleService = createMockDrizzleService()
	const broadcastService = createMockBroadcastService()
	const slotCleanupService = createMockSlotCleanupService()

	const service = new PaymentsService(
		paymentsRepo as any,
		registrationRepo as any,
		eventsService as any,
		stripeService as any,
		drizzleService as any,
		broadcastService as any,
		slotCleanupService as any,
	)

	return {
		service,
		paymentsRepo,
		registrationRepo,
		eventsService,
	}
}

// =============================================================================
// Tests
// =============================================================================

describe("PaymentsService.getAdminPaymentDetails", () => {
	it("returns payment details when payment is valid and belongs to user", async () => {
		const { service, paymentsRepo, registrationRepo, eventsService } = createService()

		paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
		registrationRepo.findRegistrationById.mockResolvedValue(createRegistrationRow())
		eventsService.getEventById.mockResolvedValue(
			createClubEvent({ id: 100, name: "Summer Open", startDate: "2025-06-15" }),
		)

		const result = await service.getAdminPaymentDetails(1, 1, 10)

		expect(result).toEqual({
			paymentId: 1,
			registrationId: 1,
			eventId: 100,
			eventName: "Summer Open",
			eventDate: "2025-06-15",
		})
	})

	it("throws NotFoundException when payment not found", async () => {
		const { service, paymentsRepo } = createService()
		paymentsRepo.findPaymentById.mockResolvedValue(null)

		await expect(service.getAdminPaymentDetails(999, 1, 10)).rejects.toThrow(NotFoundException)
	})

	it("throws ForbiddenException when payment belongs to a different user", async () => {
		const { service, paymentsRepo } = createService()
		paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow({ userId: 99 }))

		await expect(service.getAdminPaymentDetails(1, 1, 10)).rejects.toThrow(ForbiddenException)
	})

	it("throws BadRequestException when paymentCode is not Requested", async () => {
		const { service, paymentsRepo } = createService()
		paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow({ paymentCode: "pi_abc123" }))

		await expect(service.getAdminPaymentDetails(1, 1, 10)).rejects.toThrow(BadRequestException)
	})

	it("throws BadRequestException when payment is already confirmed", async () => {
		const { service, paymentsRepo } = createService()
		paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow({ confirmed: 1 }))

		await expect(service.getAdminPaymentDetails(1, 1, 10)).rejects.toThrow(BadRequestException)
	})

	it("throws NotFoundException when registration not found", async () => {
		const { service, paymentsRepo, registrationRepo } = createService()
		paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
		registrationRepo.findRegistrationById.mockResolvedValue(null)

		await expect(service.getAdminPaymentDetails(1, 999, 10)).rejects.toThrow(NotFoundException)
	})

	it("throws BadRequestException when registration is expired", async () => {
		const { service, paymentsRepo, registrationRepo } = createService()
		paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
		registrationRepo.findRegistrationById.mockResolvedValue(
			createRegistrationRow({ expires: "2020-01-01 00:00:00" }),
		)

		await expect(service.getAdminPaymentDetails(1, 1, 10)).rejects.toThrow(BadRequestException)
	})

	it("returns correct event name and date in response", async () => {
		const { service, paymentsRepo, registrationRepo, eventsService } = createService()

		paymentsRepo.findPaymentById.mockResolvedValue(createPaymentRow())
		registrationRepo.findRegistrationById.mockResolvedValue(createRegistrationRow())
		eventsService.getEventById.mockResolvedValue(
			createClubEvent({ name: "Fall Classic", startDate: "2025-09-20" }),
		)

		const result = await service.getAdminPaymentDetails(1, 1, 10)

		expect(result.eventName).toBe("Fall Classic")
		expect(result.eventDate).toBe("2025-09-20")
	})
})
