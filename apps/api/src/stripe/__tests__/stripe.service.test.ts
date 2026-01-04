import type { PaymentIntentMetadata } from "@repo/domain/types"
import { StripeService } from "../stripe.service"

// =============================================================================
// Test Fixtures
// =============================================================================

const createMetadata = (overrides: Partial<PaymentIntentMetadata> = {}): PaymentIntentMetadata => ({
	eventId: 100,
	registrationId: 1,
	paymentId: 1,
	userName: "John Doe",
	userEmail: "john@example.com",
	eventName: "Test Event",
	eventStartDate: "2025-06-15",
	...overrides,
})

// =============================================================================
// Mock Factories
// =============================================================================

const createMockStripe = () => ({
	refunds: {
		create: jest.fn(),
	},
	paymentIntents: {
		create: jest.fn(),
		cancel: jest.fn(),
	},
	customers: {
		create: jest.fn(),
	},
	customerSessions: {
		create: jest.fn(),
	},
	webhooks: {
		constructEvent: jest.fn(),
	},
})

const createMockConfigService = () => ({
	get: jest.fn((key: string, defaultValue?: string) => {
		if (key === "STRIPE_SECRET_KEY") return "sk_test_xxx"
		if (key === "STRIPE_API_VERSION") return defaultValue
		return undefined
	}),
	getOrThrow: jest.fn(() => "whsec_test"),
})

// =============================================================================
// Tests
// =============================================================================

describe("StripeService", () => {
	let service: StripeService
	let mockStripe: ReturnType<typeof createMockStripe>
	let mockConfigService: ReturnType<typeof createMockConfigService>

	beforeEach(() => {
		mockStripe = createMockStripe()
		mockConfigService = createMockConfigService()

		service = new StripeService(mockConfigService as never)
		// Replace private stripe instance with mock
		;(service as unknown as { stripe: typeof mockStripe }).stripe = mockStripe
	})

	// =========================================================================
	// createRefund
	// =========================================================================

	describe("createRefund", () => {
		it("throws when paymentIntentId is empty", async () => {
			await expect(service.createRefund("")).rejects.toThrow("Payment Intent ID is required")
		})

		it("throws when paymentIntentId is whitespace", async () => {
			await expect(service.createRefund("   ")).rejects.toThrow("Payment Intent ID is required")
		})

		it("throws when paymentIntentId has invalid prefix", async () => {
			await expect(service.createRefund("invalid_123")).rejects.toThrow("Invalid Payment Intent ID")
		})

		it("throws when amount is zero", async () => {
			await expect(service.createRefund("pi_test123", 0)).rejects.toThrow(
				"Refund amount must be positive",
			)
		})

		it("throws when amount is negative", async () => {
			await expect(service.createRefund("pi_test123", -10)).rejects.toThrow(
				"Refund amount must be positive",
			)
		})

		it("creates full refund when no amount provided", async () => {
			mockStripe.refunds.create.mockResolvedValue({ id: "re_test123" })

			const result = await service.createRefund("pi_test123")

			expect(result).toBe("re_test123")
			expect(mockStripe.refunds.create).toHaveBeenCalledWith({
				payment_intent: "pi_test123",
			})
		})

		it("converts dollars to cents for partial refund", async () => {
			mockStripe.refunds.create.mockResolvedValue({ id: "re_test123" })

			await service.createRefund("pi_test123", 25.5)

			expect(mockStripe.refunds.create).toHaveBeenCalledWith({
				payment_intent: "pi_test123",
				amount: 2550, // 25.50 * 100
			})
		})

		it("returns refund id from Stripe response", async () => {
			mockStripe.refunds.create.mockResolvedValue({ id: "re_abc123xyz" })

			const result = await service.createRefund("pi_test123")

			expect(result).toBe("re_abc123xyz")
		})
	})

	// =========================================================================
	// createPaymentIntent
	// =========================================================================

	describe("createPaymentIntent", () => {
		it("throws when amountCents is zero", async () => {
			const metadata = createMetadata()
			await expect(service.createPaymentIntent(0, "Test", metadata)).rejects.toThrow(
				"Payment amount must be positive",
			)
		})

		it("throws when amountCents is negative", async () => {
			const metadata = createMetadata()
			await expect(service.createPaymentIntent(-100, "Test", metadata)).rejects.toThrow(
				"Payment amount must be positive",
			)
		})

		it("throws when Stripe returns no client_secret", async () => {
			mockStripe.paymentIntents.create.mockResolvedValue({ id: "pi_test123" })
			const metadata = createMetadata()

			await expect(service.createPaymentIntent(1000, "Test", metadata)).rejects.toThrow(
				"Failed to create PaymentIntent: no client secret returned",
			)
		})

		it("passes correct metadata with all fields as strings", async () => {
			mockStripe.paymentIntents.create.mockResolvedValue({
				id: "pi_test123",
				client_secret: "secret_abc",
			})
			const metadata = createMetadata({
				eventId: 200,
				registrationId: 5,
				paymentId: 10,
			})

			await service.createPaymentIntent(1000, "Test Payment", metadata)

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 1000,
					currency: "usd",
					description: "Test Payment",
					metadata: {
						eventId: "200",
						registrationId: "5",
						paymentId: "10",
						userName: "John Doe",
						userEmail: "john@example.com",
						eventName: "Test Event",
						eventStartDate: "2025-06-15",
					},
					automatic_payment_methods: { enabled: true },
				}),
			)
		})

		it("includes customerId when provided", async () => {
			mockStripe.paymentIntents.create.mockResolvedValue({
				id: "pi_test123",
				client_secret: "secret_abc",
			})
			const metadata = createMetadata()

			await service.createPaymentIntent(1000, "Test", metadata, "cus_test123")

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: "cus_test123",
				}),
			)
		})

		it("includes receipt_email when email provided", async () => {
			mockStripe.paymentIntents.create.mockResolvedValue({
				id: "pi_test123",
				client_secret: "secret_abc",
			})
			const metadata = createMetadata()

			await service.createPaymentIntent(1000, "Test", metadata, undefined, "user@example.com")

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					receipt_email: "user@example.com",
				}),
			)
		})

		it("returns full PaymentIntent from Stripe", async () => {
			const mockPaymentIntent = {
				id: "pi_test123",
				client_secret: "secret_abc",
				amount: 1000,
				currency: "usd",
			}
			mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)
			const metadata = createMetadata()

			const result = await service.createPaymentIntent(1000, "Test", metadata)

			expect(result).toEqual(mockPaymentIntent)
		})
	})

	// =========================================================================
	// cancelPaymentIntent
	// =========================================================================

	describe("cancelPaymentIntent", () => {
		it("throws for empty paymentIntentId", async () => {
			await expect(service.cancelPaymentIntent("")).rejects.toThrow("Invalid Payment Intent ID")
		})

		it("throws for invalid prefix", async () => {
			await expect(service.cancelPaymentIntent("invalid_123")).rejects.toThrow(
				"Invalid Payment Intent ID",
			)
		})

		it("calls Stripe cancel on valid ID", async () => {
			mockStripe.paymentIntents.cancel.mockResolvedValue({ id: "pi_test123" })

			await service.cancelPaymentIntent("pi_test123")

			expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith("pi_test123")
		})
	})

	// =========================================================================
	// createCustomerSession
	// =========================================================================

	describe("createCustomerSession", () => {
		it("throws for empty customerId", async () => {
			await expect(service.createCustomerSession("")).rejects.toThrow("Invalid Customer ID")
		})

		it("throws for invalid prefix", async () => {
			await expect(service.createCustomerSession("invalid_123")).rejects.toThrow(
				"Invalid Customer ID",
			)
		})

		it("throws when Stripe returns no client_secret", async () => {
			mockStripe.customerSessions.create.mockResolvedValue({})

			await expect(service.createCustomerSession("cus_test123")).rejects.toThrow(
				"Failed to create customer session: no client secret returned",
			)
		})

		it("returns client_secret on success", async () => {
			mockStripe.customerSessions.create.mockResolvedValue({
				client_secret: "cs_secret_abc123",
			})

			const result = await service.createCustomerSession("cus_test123")

			expect(result).toBe("cs_secret_abc123")
		})

		it("passes correct payment_element config", async () => {
			mockStripe.customerSessions.create.mockResolvedValue({
				client_secret: "cs_secret_abc123",
			})

			await service.createCustomerSession("cus_test123")

			expect(mockStripe.customerSessions.create).toHaveBeenCalledWith({
				customer: "cus_test123",
				components: {
					payment_element: {
						enabled: true,
						features: {
							payment_method_redisplay: "enabled",
							payment_method_save: "enabled",
							payment_method_save_usage: "on_session",
							payment_method_remove: "enabled",
						},
					},
				},
			})
		})
	})
})
