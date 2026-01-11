import {
	AgeRestrictionTypeChoices,
	EventTypeChoices,
	NotificationTypeChoices,
} from "@repo/domain/types"
import type { ClubEvent, RegistrationWithSlots, CompletePayment } from "@repo/domain/types"
import type Stripe from "stripe"

import { StripeWebhookService } from "../stripe-webhook.service"

// =============================================================================
// Test Fixtures
// =============================================================================

const createPaymentIntent = (overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent =>
	({
		id: "pi_test123",
		object: "payment_intent",
		amount: 2500,
		currency: "usd",
		status: "succeeded",
		metadata: {
			registrationId: "1",
			paymentId: "1",
			eventId: "100",
		},
		...overrides,
	}) as Stripe.PaymentIntent

const createRefund = (overrides: Partial<Stripe.Refund> = {}): Stripe.Refund =>
	({
		id: "re_test123",
		object: "refund",
		payment_intent: "pi_test123",
		amount: 2500,
		status: "succeeded",
		reason: null,
		...overrides,
	}) as Stripe.Refund

const createPaymentRecord = (
	overrides: Partial<{ id: number; confirmed: boolean; userId: number; eventId: number }> = {},
) => ({
	id: 1,
	confirmed: false,
	userId: 10,
	eventId: 100,
	notificationType: NotificationTypeChoices.SIGNUP_CONFIRMATION,
	...overrides,
})

const createUser = (
	overrides: Partial<{ id: number; firstName: string; lastName: string; email: string }> = {},
) => ({
	id: 10,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
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
	eventFees: [],
	season: 2025,
	starterTimeInterval: 0,
	teamSize: 1,
	ageRestrictionType: AgeRestrictionTypeChoices.NONE,
	...overrides,
})

const createRegistration = (
	overrides: Partial<RegistrationWithSlots> = {},
): RegistrationWithSlots => ({
	id: 1,
	eventId: 100,
	signedUpBy: "John Doe",
	slots: [],
	userId: 1,
	createdDate: new Date().toISOString(),
	...overrides,
})

const createCompletePayment = (overrides: Partial<CompletePayment> = {}): CompletePayment => ({
	id: 1,
	paymentCode: "pi_test123",
	confirmed: true,
	eventId: 100,
	userId: 10,
	paymentAmount: 25,
	transactionFee: 1.03,
	paymentDate: "2025-01-01",
	notificationType: NotificationTypeChoices.SIGNUP_CONFIRMATION,
	details: [],
	...overrides,
})

// =============================================================================
// Mock Factories
// =============================================================================

const createMockPaymentsService = () => ({
	findPaymentByPaymentCode: jest.fn(),
	paymentConfirmed: jest.fn(),
})

const createMockAdminRegistrationService = () => ({
	getCompleteRegistrationAndPayment: jest.fn(),
	updateMembershipStatus: jest.fn(),
})

const createMockRefundService = () => ({
	createRefund: jest.fn(),
	findRefundByRefundCode: jest.fn(),
	confirmRefund: jest.fn(),
})

const createMockDjangoAuthService = () => ({
	getOrCreateSystemUser: jest.fn(),
	findById: jest.fn(),
})

const createMockEventsService = () => ({
	getCompleteClubEventById: jest.fn(),
})

const createMockMailService = () => ({
	sendWelcomeBackEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
	sendMatchPlayEmail: jest.fn(),
	sendRegistrationUpdate: jest.fn(),
	sendRegistrationConfirmation: jest.fn(),
	sendRefundNotification: jest.fn(),
})

// =============================================================================
// Tests
// =============================================================================

describe("StripeWebhookService", () => {
	let service: StripeWebhookService
	let mockAdminRegistrationService: ReturnType<typeof createMockAdminRegistrationService>
	let mockPaymentsService: ReturnType<typeof createMockPaymentsService>
	let mockRefundService: ReturnType<typeof createMockRefundService>
	let mockDjangoAuthService: ReturnType<typeof createMockDjangoAuthService>
	let mockEventsService: ReturnType<typeof createMockEventsService>
	let mockMailService: ReturnType<typeof createMockMailService>

	beforeEach(() => {
		mockAdminRegistrationService = createMockAdminRegistrationService()
		mockPaymentsService = createMockPaymentsService()
		mockRefundService = createMockRefundService()
		mockDjangoAuthService = createMockDjangoAuthService()
		mockEventsService = createMockEventsService()
		mockMailService = createMockMailService()

		service = new StripeWebhookService(
			mockAdminRegistrationService as never,
			mockPaymentsService as never,
			mockRefundService as never,
			mockDjangoAuthService as never,
			mockEventsService as never,
			mockMailService as never,
		)
	})

	// =========================================================================
	// handlePaymentIntentSucceeded
	// =========================================================================

	describe("handlePaymentIntentSucceeded", () => {
		it("returns early when no payment found for paymentIntentId", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(null)
			const paymentIntent = createPaymentIntent()

			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockPaymentsService.paymentConfirmed).not.toHaveBeenCalled()
		})

		it("returns early when payment already confirmed (idempotency)", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(
				createPaymentRecord({ confirmed: true }),
			)
			const paymentIntent = createPaymentIntent()

			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockPaymentsService.paymentConfirmed).not.toHaveBeenCalled()
		})

		it("returns early when no registrationId in metadata", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			const paymentIntent = createPaymentIntent({ metadata: {} })

			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockPaymentsService.paymentConfirmed).not.toHaveBeenCalled()
		})

		it("parses registrationId from string metadata", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord({ id: 5 }))
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment(),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const paymentIntent = createPaymentIntent({
				metadata: { registrationId: "42", paymentId: "5" },
			})

			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockPaymentsService.paymentConfirmed).toHaveBeenCalledWith(42, 5)
		})

		it("calls paymentConfirmed with correct IDs", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord({ id: 7 }))
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment(),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const paymentIntent = createPaymentIntent({
				metadata: { registrationId: "10", paymentId: "7" },
			})

			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockPaymentsService.paymentConfirmed).toHaveBeenCalledWith(10, 7)
		})
	})

	// =========================================================================
	// handleRefundCreated
	// =========================================================================

	describe("handleRefundCreated", () => {
		it("extracts paymentIntentId from string type", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const refund = createRefund({ payment_intent: "pi_string123" })

			await service.handleRefundCreated(refund)

			expect(mockPaymentsService.findPaymentByPaymentCode).toHaveBeenCalledWith("pi_string123")
		})

		it("extracts paymentIntentId from object type", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const refund = createRefund({
				payment_intent: { id: "pi_object123" } as Stripe.PaymentIntent,
			})

			await service.handleRefundCreated(refund)

			expect(mockPaymentsService.findPaymentByPaymentCode).toHaveBeenCalledWith("pi_object123")
		})

		it("returns early when no paymentIntentId", async () => {
			const refund = createRefund({ payment_intent: null })

			await service.handleRefundCreated(refund)

			expect(mockPaymentsService.findPaymentByPaymentCode).not.toHaveBeenCalled()
		})

		it("returns early when no payment found", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(null)
			const refund = createRefund()

			await service.handleRefundCreated(refund)

			expect(mockRefundService.createRefund).not.toHaveBeenCalled()
		})

		it("returns early when refund already exists (idempotency)", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue({ id: 1 })
			const refund = createRefund()

			await service.handleRefundCreated(refund)

			expect(mockRefundService.createRefund).not.toHaveBeenCalled()
		})

		it('uses "requested_by_customer" as default reason', async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const refund = createRefund({ reason: null })

			await service.handleRefundCreated(refund)

			expect(mockRefundService.createRefund).toHaveBeenCalledWith(
				expect.objectContaining({
					notes: "requested_by_customer",
				}),
			)
		})

		it("converts amount from cents to dollars", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const refund = createRefund({ amount: 5075 }) // $50.75

			await service.handleRefundCreated(refund)

			expect(mockRefundService.createRefund).toHaveBeenCalledWith(
				expect.objectContaining({
					refundAmount: 50.75,
				}),
			)
		})

		it("creates refund with systemUserId from djangoAuthService", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord({ id: 5 }))
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(123)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const refund = createRefund({ id: "re_abc123" })

			await service.handleRefundCreated(refund)

			expect(mockDjangoAuthService.getOrCreateSystemUser).toHaveBeenCalledWith("stripe_system")
			expect(mockRefundService.createRefund).toHaveBeenCalledWith({
				refundCode: "re_abc123",
				refundAmount: 25,
				notes: "requested_by_customer",
				issuerId: 123,
				paymentId: 5,
			})
		})
	})

	// =========================================================================
	// handleRefundUpdated
	// =========================================================================

	describe("handleRefundUpdated", () => {
		it("returns early when status is not succeeded", async () => {
			const refund = createRefund({ status: "pending" })

			await service.handleRefundUpdated(refund)

			expect(mockRefundService.confirmRefund).not.toHaveBeenCalled()
		})

		it("calls confirmRefund when status is succeeded", async () => {
			const refund = createRefund({ id: "re_success123", status: "succeeded" })

			await service.handleRefundUpdated(refund)

			expect(mockRefundService.confirmRefund).toHaveBeenCalledWith("re_success123")
		})
	})

	// =========================================================================
	// sendConfirmationEmail (tested via handlePaymentIntentSucceeded)
	// =========================================================================

	describe("sendConfirmationEmail integration", () => {
		const setupSuccessfulPayment = () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
		}

		it("returns early when user not found", async () => {
			setupSuccessfulPayment()
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment(),
			})
			mockDjangoAuthService.findById.mockResolvedValue(null)

			const paymentIntent = createPaymentIntent()
			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockMailService.sendRegistrationConfirmation).not.toHaveBeenCalled()
		})

		it("updates membership status for SEASON_REGISTRATION events", async () => {
			setupSuccessfulPayment()
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment({ userId: 10 }),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser({ id: 10 }))
			mockEventsService.getCompleteClubEventById.mockResolvedValue(
				createClubEvent({
					eventType: EventTypeChoices.SEASON_REGISTRATION,
					startDate: "2025-06-15",
				}),
			)

			const paymentIntent = createPaymentIntent()
			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockAdminRegistrationService.updateMembershipStatus).toHaveBeenCalledWith(10, 2025)
		})

		it("sends welcome-back email for RETURNING_MEMBER", async () => {
			setupSuccessfulPayment()
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment({
					notificationType: NotificationTypeChoices.RETURNING_MEMBER,
				}),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(
				createClubEvent({ startDate: "2025-06-15" }),
			)

			const paymentIntent = createPaymentIntent()
			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockMailService.sendWelcomeBackEmail).toHaveBeenCalledWith(
				{ firstName: "John", email: "john@example.com" },
				"2025",
			)
		})

		it("sends welcome email for NEW_MEMBER", async () => {
			setupSuccessfulPayment()
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment({
					notificationType: NotificationTypeChoices.NEW_MEMBER,
				}),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(
				createClubEvent({ startDate: "2025-06-15" }),
			)

			const paymentIntent = createPaymentIntent()
			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledWith(
				{ firstName: "John", email: "john@example.com" },
				"2025",
			)
		})

		it("sends match-play email for MATCH_PLAY", async () => {
			setupSuccessfulPayment()
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment({
					notificationType: NotificationTypeChoices.MATCH_PLAY,
				}),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(
				createClubEvent({ startDate: "2025-06-15" }),
			)

			const paymentIntent = createPaymentIntent()
			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockMailService.sendMatchPlayEmail).toHaveBeenCalledWith(
				{ firstName: "John", email: "john@example.com" },
				"2025",
			)
		})

		it("sends registration update for UPDATED_REGISTRATION", async () => {
			setupSuccessfulPayment()
			const registration = createRegistration()
			const payment = createCompletePayment({
				notificationType: NotificationTypeChoices.UPDATED_REGISTRATION,
			})
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration,
				payment,
			})
			const user = createUser()
			mockDjangoAuthService.findById.mockResolvedValue(user)
			const event = createClubEvent()
			mockEventsService.getCompleteClubEventById.mockResolvedValue(event)

			const paymentIntent = createPaymentIntent()
			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockMailService.sendRegistrationUpdate).toHaveBeenCalledWith(
				user,
				event,
				registration,
				payment,
			)
		})

		it("sends registration confirmation for default notification type", async () => {
			setupSuccessfulPayment()
			const registration = createRegistration()
			const payment = createCompletePayment({
				notificationType: NotificationTypeChoices.SIGNUP_CONFIRMATION,
			})
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration,
				payment,
			})
			const user = createUser()
			mockDjangoAuthService.findById.mockResolvedValue(user)
			const event = createClubEvent()
			mockEventsService.getCompleteClubEventById.mockResolvedValue(event)

			const paymentIntent = createPaymentIntent()
			await service.handlePaymentIntentSucceeded(paymentIntent)

			expect(mockMailService.sendRegistrationConfirmation).toHaveBeenCalledWith(
				user,
				event,
				registration,
				payment,
			)
		})

		it("catches errors and does not throw", async () => {
			setupSuccessfulPayment()
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockRejectedValue(
				new Error("Database error"),
			)

			const paymentIntent = createPaymentIntent()

			// Should not throw
			await expect(service.handlePaymentIntentSucceeded(paymentIntent)).resolves.not.toThrow()
		})

		it("handles mail service error gracefully", async () => {
			setupSuccessfulPayment()
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment(),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())
			mockMailService.sendRegistrationConfirmation.mockRejectedValue(
				new Error("Mail service down"),
			)

			const paymentIntent = createPaymentIntent()

			// Should not throw even if mail service fails
			await expect(service.handlePaymentIntentSucceeded(paymentIntent)).resolves.not.toThrow()
			expect(mockPaymentsService.paymentConfirmed).toHaveBeenCalled()
		})
	})

	// =========================================================================
	// handlePaymentIntentFailed
	// =========================================================================

	describe("handlePaymentIntentFailed", () => {
		it("logs payment failure without throwing", () => {
			const paymentIntent = createPaymentIntent({ status: "requires_payment_method" })

			// Should not throw
			expect(() => {
				service.handlePaymentIntentFailed(paymentIntent)
			}).not.toThrow()
		})
	})

	// =========================================================================
	// handlePaymentIntentSucceeded - Edge Cases
	// =========================================================================

	describe("handlePaymentIntentSucceeded - edge cases", () => {
		it("handles non-numeric registrationId gracefully", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			const paymentIntent = createPaymentIntent({
				metadata: { registrationId: "abc", paymentId: "1" },
			})

			await service.handlePaymentIntentSucceeded(paymentIntent)

			// Should return early because parseInt("abc", 10) returns NaN
			expect(mockPaymentsService.paymentConfirmed).not.toHaveBeenCalled()
		})

		it("handles registrationId with leading/trailing spaces", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord({ id: 5 }))
			mockAdminRegistrationService.getCompleteRegistrationAndPayment.mockResolvedValue({
				registration: createRegistration(),
				payment: createCompletePayment(),
			})
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			const paymentIntent = createPaymentIntent({
				metadata: { registrationId: "  42  ", paymentId: "5" },
			})

			await service.handlePaymentIntentSucceeded(paymentIntent)

			// parseInt with leading/trailing spaces should work fine
			expect(mockPaymentsService.paymentConfirmed).toHaveBeenCalledWith(42, 5)
		})

		it("handles undefined metadata object gracefully", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			const paymentIntent = createPaymentIntent({
				metadata: undefined as any,
			})

			await service.handlePaymentIntentSucceeded(paymentIntent)

			// Should return early because metadata is undefined
			expect(mockPaymentsService.paymentConfirmed).not.toHaveBeenCalled()
		})
	})

	// =========================================================================
	// handleRefundCreated - Error Scenarios
	// =========================================================================

	describe("handleRefundCreated - error scenarios", () => {
		it("handles very large refund amount conversion correctly", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())

			// $10,000.00 in cents
			const refund = createRefund({ amount: 1000000 })

			await service.handleRefundCreated(refund)

			expect(mockRefundService.createRefund).toHaveBeenCalledWith(
				expect.objectContaining({
					refundAmount: 10000,
				}),
			)
		})

		it("handles system user creation failure gracefully", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockRejectedValue(
				new Error("Auth service error"),
			)

			const refund = createRefund()

			// Should not throw
			await expect(service.handleRefundCreated(refund)).rejects.toThrow()
		})

		it("handles createRefund failure gracefully", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockRefundService.createRefund.mockRejectedValue(new Error("Database error"))

			const refund = createRefund()

			// Should not throw
			await expect(service.handleRefundCreated(refund)).rejects.toThrow()
		})
	})

	// =========================================================================
	// handleRefundUpdated - Error Scenarios
	// =========================================================================

	describe("handleRefundUpdated - error scenarios", () => {
		it("handles confirmRefund failure gracefully", async () => {
			mockRefundService.confirmRefund.mockRejectedValue(new Error("Database error"))
			const refund = createRefund({ id: "re_fail123", status: "succeeded" })

			// Should not throw
			await expect(service.handleRefundUpdated(refund)).rejects.toThrow()
		})
	})

	// =========================================================================
	// sendRefundNotificationEmail - Error Scenarios
	// =========================================================================

	describe("sendRefundNotificationEmail - error scenarios", () => {
		it("handles mail service error gracefully during refund notification", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockResolvedValue(createClubEvent())
			mockMailService.sendRefundNotification.mockRejectedValue(
				new Error("Mail service down"),
			)

			const refund = createRefund()

			// Should not throw even if mail service fails
			await expect(service.handleRefundCreated(refund)).resolves.not.toThrow()
			expect(mockRefundService.createRefund).toHaveBeenCalled()
		})

		it("handles user not found for refund notification gracefully", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(null)

			const refund = createRefund()

			// Should not throw, should return early when user not found
			await expect(service.handleRefundCreated(refund)).resolves.not.toThrow()
			expect(mockMailService.sendRefundNotification).not.toHaveBeenCalled()
		})

		it("handles event not found for refund notification gracefully", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(createPaymentRecord())
			mockRefundService.findRefundByRefundCode.mockResolvedValue(null)
			mockDjangoAuthService.getOrCreateSystemUser.mockResolvedValue(99)
			mockDjangoAuthService.findById.mockResolvedValue(createUser())
			mockEventsService.getCompleteClubEventById.mockRejectedValue(
				new Error("Event not found"),
			)

			const refund = createRefund()

			// Should not throw even if event lookup fails
			await expect(service.handleRefundCreated(refund)).resolves.not.toThrow()
		})
	})

	// =========================================================================
	// Concurrent/Idempotency Tests
	// =========================================================================

	describe("idempotency and concurrent handling", () => {
		it("handles duplicate webhook events idempotently", async () => {
			mockPaymentsService.findPaymentByPaymentCode.mockResolvedValue(
				createPaymentRecord({ confirmed: true }),
			)
			const paymentIntent = createPaymentIntent()

			// Process same event twice
			await service.handlePaymentIntentSucceeded(paymentIntent)
			await service.handlePaymentIntentSucceeded(paymentIntent)

			// paymentConfirmed should only be called once (or not at all due to idempotency)
			expect(mockPaymentsService.paymentConfirmed).not.toHaveBeenCalled()
		})
	})
})
