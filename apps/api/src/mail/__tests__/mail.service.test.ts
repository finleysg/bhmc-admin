import { ConfigService } from "@nestjs/config"
import {
	ClubEvent,
	CompletePayment,
	CompleteRegistration,
	CompleteRegistrationSlot,
	DjangoUser,
	EventTypeChoices,
	FeeRestrictionChoices,
	PayoutTypeChoices,
	RegistrationStatusChoices,
} from "@repo/domain/types"

import { MailService } from "../mail.service"

// =============================================================================
// Test Fixtures
// =============================================================================

const createPlayer = (overrides: Partial<CompleteRegistrationSlot["player"]> = {}) => ({
	id: 1,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	phoneNumber: null,
	ghin: null,
	tee: "White",
	birthDate: null,
	isMember: true,
	lastSeason: null as number | null | undefined,
	ggId: null,
	userId: 10,
	stripeCustomerId: null,
	...overrides,
})

const createSlot = (
	overrides: Partial<CompleteRegistrationSlot> = {},
): CompleteRegistrationSlot => ({
	id: 1,
	registrationId: 1,
	eventId: 100,
	startingOrder: 0,
	slot: 0,
	status: RegistrationStatusChoices.PENDING,
	holeId: 1,
	hole: { id: 1, courseId: 1, holeNumber: 1, par: 4 },
	playerId: 1,
	player: createPlayer(),
	ggId: undefined,
	fees: [],
	...overrides,
})

const createRegistration = (
	overrides: Partial<CompleteRegistration> = {},
): CompleteRegistration => ({
	id: 1,
	eventId: 100,
	notes: undefined,
	courseId: 1,
	course: { id: 1, name: "Test Course", numberOfHoles: 18, holes: [], tees: [] },
	signedUpBy: "Admin User",
	userId: 10,
	expires: undefined,
	ggId: undefined,
	createdDate: "2025-01-01 08:00:00",
	slots: [createSlot()],
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
	signupStart: "2025-06-01",
	signupEnd: "2025-06-14",
	eventFees: [],
	...overrides,
})

// =============================================================================
// Mock Setup
// =============================================================================

const createMockConfigService = () => ({
	getOrThrow: jest.fn().mockImplementation((key: string) => {
		if (key === "WEBSITE_URL") return "https://example.com"
		if (key === "MAIL_FROM") return "test@example.com"
		if (key === "NODE_ENV") return "development"
		if (key === "MAIL_HOST") return "localhost"
		if (key === "MAIL_PORT") return 1025
		return ""
	}),
	get: jest.fn().mockImplementation((key: string) => {
		if (key === "NODE_ENV") return "development"
		if (key === "MAIL_SECURE") return false
		return undefined
	}),
})

// =============================================================================
// Tests
// =============================================================================

describe("MailService", () => {
	describe("sendAdminRegistrationNotification", () => {
		let service: MailService
		let mockConfigService: ReturnType<typeof createMockConfigService>
		let sendEmailSpy: jest.SpyInstance

		beforeEach(() => {
			mockConfigService = createMockConfigService()
			service = new MailService(mockConfigService as unknown as ConfigService)
			sendEmailSpy = jest.spyOn(service, "sendEmail").mockResolvedValue(undefined)
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		describe("SEASON_REGISTRATION events", () => {
			const seasonEvent = createClubEvent({
				eventType: EventTypeChoices.SEASON_REGISTRATION,
				startDate: "2025-01-15",
			})

			it("sends WelcomeHonoraryEmail when collectPayment is false", async () => {
				const registration = createRegistration()

				await service.sendAdminRegistrationNotification(
					seasonEvent,
					registration,
					1,
					"john@example.com",
					false,
				)

				expect(sendEmailSpy).toHaveBeenCalledTimes(1)
				expect(sendEmailSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						to: "john@example.com",
						subject: "It's Great to Have You Back!",
					}),
				)
			})

			it("sends WelcomeBackEmail with paymentUrl for returning member when collectPayment is true", async () => {
				const currentYear = new Date().getFullYear()
				const registration = createRegistration({
					slots: [
						createSlot({
							player: createPlayer({ lastSeason: currentYear - 1 }),
						}),
					],
				})

				await service.sendAdminRegistrationNotification(
					seasonEvent,
					registration,
					1,
					"john@example.com",
					true,
				)

				expect(sendEmailSpy).toHaveBeenCalledTimes(1)
				expect(sendEmailSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						to: "john@example.com",
						subject: "It's Great to Have You Back!",
					}),
				)
			})

			it("sends WelcomeEmail with paymentUrl for new member when collectPayment is true", async () => {
				const registration = createRegistration({
					slots: [
						createSlot({
							player: createPlayer({ lastSeason: null }),
						}),
					],
				})

				await service.sendAdminRegistrationNotification(
					seasonEvent,
					registration,
					1,
					"john@example.com",
					true,
				)

				expect(sendEmailSpy).toHaveBeenCalledTimes(1)
				expect(sendEmailSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						to: "john@example.com",
						subject: "Welcome to the Bunker Hills Men's Club!",
					}),
				)
			})

			it("sends emails to each player in registration", async () => {
				const registration = createRegistration({
					slots: [
						createSlot({
							id: 1,
							player: createPlayer({ id: 1, email: "player1@example.com", lastSeason: null }),
						}),
						createSlot({
							id: 2,
							player: createPlayer({ id: 2, email: "player2@example.com", lastSeason: null }),
						}),
					],
				})

				await service.sendAdminRegistrationNotification(
					seasonEvent,
					registration,
					1,
					"player1@example.com",
					true,
				)

				expect(sendEmailSpy).toHaveBeenCalledTimes(2)
			})
		})

		describe("non-SEASON_REGISTRATION events", () => {
			const weeknightEvent = createClubEvent({
				eventType: EventTypeChoices.WEEKNIGHT,
			})

			it("sends AdminRegistrationNotificationEmail", async () => {
				const registration = createRegistration()

				await service.sendAdminRegistrationNotification(
					weeknightEvent,
					registration,
					1,
					"john@example.com",
					true,
				)

				expect(sendEmailSpy).toHaveBeenCalledTimes(1)
				expect(sendEmailSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						to: "john@example.com",
						subject: "Event Registration: Test Event",
					}),
				)
			})

			it("includes paymentUrl only for payment user when collectPayment is true", async () => {
				const registration = createRegistration({
					slots: [
						createSlot({
							id: 1,
							player: createPlayer({ id: 1, email: "player1@example.com" }),
						}),
						createSlot({
							id: 2,
							player: createPlayer({ id: 2, email: "player2@example.com" }),
						}),
					],
				})

				await service.sendAdminRegistrationNotification(
					weeknightEvent,
					registration,
					1,
					"player1@example.com",
					true,
				)

				expect(sendEmailSpy).toHaveBeenCalledTimes(2)
			})
		})
	})

	describe("sendRegistrationConfirmation", () => {
		let service: MailService
		let mockConfigService: ReturnType<typeof createMockConfigService>
		let sendEmailSpy: jest.SpyInstance

		beforeEach(() => {
			mockConfigService = createMockConfigService()
			service = new MailService(mockConfigService as unknown as ConfigService)
			sendEmailSpy = jest.spyOn(service, "sendEmail").mockResolvedValue(undefined)
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it("includes transaction fee in total event cost", async () => {
			const user: DjangoUser = {
				id: 10,
				email: "john@example.com",
				firstName: "John",
				lastName: "Doe",
				isActive: true,
				isStaff: false,
				isSuperuser: false,
				ghin: null,
				birthDate: null,
				playerId: 1,
			}

			const event = createClubEvent()
			const registration = createRegistration()

			const payment: CompletePayment = {
				id: 1,
				paymentCode: "pi_test",
				confirmed: true,
				eventId: 100,
				userId: 10,
				paymentAmount: 5.0,
				transactionFee: 0.45,
				paymentDate: "2025-01-01",
				details: [
					{
						id: 1,
						registrationSlotId: 1,
						paymentId: 1,
						amount: 5.0,
						isPaid: true,
						eventFeeId: 1,
						eventFee: {
							id: 1,
							eventId: 100,
							amount: 5.0,
							isRequired: true,
							displayOrder: 1,
							feeTypeId: 1,
							feeType: {
								id: 1,
								name: "Event Fee",
								code: "EF",
								payout: PayoutTypeChoices.CASH,
								restriction: FeeRestrictionChoices.NONE,
							},
						},
					},
				],
			}

			await service.sendRegistrationConfirmation(user, event, registration, payment)

			expect(sendEmailSpy).toHaveBeenCalledTimes(1)
			expect(sendEmailSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: "Registration Confirmation: Test Event",
				}),
			)
			// Verify the template was called with the correct totalFees.
			// sendEmail receives { template: RegistrationConfirmationEmail({...props}) }.
			// Walk the React element tree to find the "$5.45" total in children.
			const template = sendEmailSpy.mock.calls[0][0].template
			const json = JSON.stringify(template)
			expect(json).toContain("$5.45")
			expect(json).toContain("$5.00")
			expect(json).toContain("$0.45")
		})
	})

	describe("sendRegistrationUpdate", () => {
		let service: MailService
		let mockConfigService: ReturnType<typeof createMockConfigService>
		let sendEmailSpy: jest.SpyInstance

		const user: DjangoUser = {
			id: 10,
			email: "nate@example.com",
			firstName: "Nate",
			lastName: "Lassila",
			isActive: true,
			isStaff: false,
			isSuperuser: false,
			ghin: null,
			birthDate: null,
			playerId: 1,
		}

		const createFee = (
			id: number,
			slotId: number,
			paymentId: number,
			name: string,
			amount: number,
			isRequired: boolean,
		) => ({
			id,
			registrationSlotId: slotId,
			paymentId,
			amount,
			isPaid: true,
			eventFeeId: id,
			eventFee: {
				id,
				eventId: 100,
				amount,
				isRequired,
				displayOrder: 1,
				feeTypeId: id,
				feeType: {
					id,
					name,
					code: name.substring(0, 2).toUpperCase(),
					payout: PayoutTypeChoices.CASH,
					restriction: FeeRestrictionChoices.NONE,
				},
			},
		})

		beforeEach(() => {
			mockConfigService = createMockConfigService()
			service = new MailService(mockConfigService as unknown as ConfigService)
			sendEmailSpy = jest.spyOn(service, "sendEmail").mockResolvedValue(undefined)
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it("only includes players with fees in the current payment", async () => {
			const event = createClubEvent()

			// Slot 1: Nate (original registration, payment 1)
			// Slot 2: Mike (original registration, payment 1)
			// Slot 3: Steve (added player, payment 2 — skins only)
			// Slot 4: David (added player, payment 2 — event fee + skins)
			const registration = createRegistration({
				slots: [
					createSlot({
						id: 10,
						player: createPlayer({
							id: 1,
							firstName: "Nate",
							lastName: "Lassila",
							email: "nate@example.com",
						}),
						fees: [createFee(1, 10, 1, "Event Fee", 5, true)],
					}),
					createSlot({
						id: 11,
						player: createPlayer({
							id: 2,
							firstName: "Mike",
							lastName: "Konieczny",
							email: "mike@example.com",
						}),
						fees: [createFee(2, 11, 1, "Event Fee", 5, true)],
					}),
					createSlot({
						id: 12,
						player: createPlayer({
							id: 3,
							firstName: "Steve",
							lastName: "Puffer",
							email: "steve@example.com",
						}),
						fees: [createFee(3, 12, 2, "Skins", 10, false)],
					}),
					createSlot({
						id: 13,
						player: createPlayer({
							id: 4,
							firstName: "David",
							lastName: "Langer",
							email: "david@example.com",
						}),
						fees: [
							createFee(4, 13, 2, "Event Fee", 5, true),
							createFee(5, 13, 2, "Skins", 10, false),
						],
					}),
				],
			})

			// Payment 2: only the fees for the added players
			const payment: CompletePayment = {
				id: 2,
				paymentCode: "pi_update",
				confirmed: true,
				eventId: 100,
				userId: 10,
				paymentAmount: 25.0,
				transactionFee: 1.03,
				paymentDate: "2025-01-02",
				details: [
					createFee(3, 12, 2, "Skins", 10, false),
					createFee(4, 13, 2, "Event Fee", 5, true),
					createFee(5, 13, 2, "Skins", 10, false),
				],
			}

			await service.sendRegistrationUpdate(user, event, registration, payment)

			const template = sendEmailSpy.mock.calls[0][0].template
			const json = JSON.stringify(template)

			// Should include only the added players
			expect(json).toContain("Steve Puffer")
			expect(json).toContain("David Langer")

			// Should NOT include original players
			expect(json).not.toContain("Nate Lassila")
			expect(json).not.toContain("Mike Konieczny")
		})

		it("only includes fees from the current payment for each player", async () => {
			const event = createClubEvent()

			// Steve has fees from both payment 1 and payment 2
			const registration = createRegistration({
				slots: [
					createSlot({
						id: 10,
						player: createPlayer({
							id: 1,
							firstName: "Steve",
							lastName: "Puffer",
							email: "steve@example.com",
						}),
						fees: [
							createFee(1, 10, 1, "Event Fee", 5, true),
							createFee(2, 10, 2, "Skins", 10, false),
						],
					}),
				],
			})

			const payment: CompletePayment = {
				id: 2,
				paymentCode: "pi_update",
				confirmed: true,
				eventId: 100,
				userId: 10,
				paymentAmount: 10.0,
				transactionFee: 0.59,
				paymentDate: "2025-01-02",
				details: [createFee(2, 10, 2, "Skins", 10, false)],
			}

			await service.sendRegistrationUpdate(user, event, registration, payment)

			const template = sendEmailSpy.mock.calls[0][0].template
			const json = JSON.stringify(template)

			// Should include Skins from payment 2
			expect(json).toContain("Skins")
			expect(json).toContain("$10.00")

			// The fee list for Steve should only contain "Skins", not "Event Fee" as a line item.
			// "Event Fee" appears as a label in the template ("Required Event Fees:"), so check
			// that the fee line item pattern doesn't include it. Fee items are rendered as:
			// "children":["Event Fee",": ","$5.00"]
			expect(json).not.toMatch(/"Event Fee",":\\s","\\$5\.00"/)
		})

		it("sends other recipients email only to players in the current payment", async () => {
			const event = createClubEvent()

			const registration = createRegistration({
				slots: [
					createSlot({
						id: 10,
						player: createPlayer({
							id: 1,
							firstName: "Nate",
							lastName: "Lassila",
							email: "nate@example.com",
						}),
						fees: [createFee(1, 10, 1, "Event Fee", 5, true)],
					}),
					createSlot({
						id: 11,
						player: createPlayer({
							id: 2,
							firstName: "David",
							lastName: "Langer",
							email: "david@example.com",
						}),
						fees: [createFee(2, 11, 2, "Event Fee", 5, true)],
					}),
				],
			})

			const payment: CompletePayment = {
				id: 2,
				paymentCode: "pi_update",
				confirmed: true,
				eventId: 100,
				userId: 10,
				paymentAmount: 5.0,
				transactionFee: 0.45,
				paymentDate: "2025-01-02",
				details: [createFee(2, 11, 2, "Event Fee", 5, true)],
			}

			await service.sendRegistrationUpdate(user, event, registration, payment)

			// 2 emails: one to user (nate), one to other recipient (david)
			expect(sendEmailSpy).toHaveBeenCalledTimes(2)
			expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({ to: "nate@example.com" }))
			expect(sendEmailSpy).toHaveBeenCalledWith(
				expect.objectContaining({ to: ["david@example.com"] }),
			)
		})
	})

	describe("sendStalePaymentNotification", () => {
		let service: MailService
		let mockConfigService: ReturnType<typeof createMockConfigService>
		let sendEmailSpy: jest.SpyInstance

		beforeEach(() => {
			mockConfigService = createMockConfigService()
			service = new MailService(mockConfigService as unknown as ConfigService)
			sendEmailSpy = jest.spyOn(service, "sendEmail").mockResolvedValue(undefined)
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it("sends email to all recipients with correct subject", async () => {
			await service.sendStalePaymentNotification(["admin@bhmc.org", "john@example.com"], {
				eventName: "Wednesday Event",
				eventDate: "Wednesday, June 15, 2026",
				registrationDate: "6/15/2026, 8:00:00 AM",
				registrationId: 42,
				paymentCode: "pi_abc123",
			})

			expect(sendEmailSpy).toHaveBeenCalledTimes(1)
			expect(sendEmailSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					to: ["admin@bhmc.org", "john@example.com"],
					subject: "Failed Payment Alert: Wednesday Event",
				}),
			)
		})

		it("includes event details in template", async () => {
			await service.sendStalePaymentNotification(["admin@bhmc.org"], {
				eventName: "Wednesday Event",
				eventDate: "Wednesday, June 15, 2026",
				registrationDate: "6/15/2026, 8:00:00 AM",
				registrationId: 42,
				paymentCode: "pi_abc123",
			})

			const template = sendEmailSpy.mock.calls[0][0].template
			const json = JSON.stringify(template)
			expect(json).toContain("Wednesday Event")
			expect(json).toContain("Wednesday, June 15, 2026")
		})
	})

	describe("sendMoveNotification", () => {
		let service: MailService
		let mockConfigService: ReturnType<typeof createMockConfigService>
		let sendEmailSpy: jest.SpyInstance

		const event = createClubEvent()

		beforeEach(() => {
			mockConfigService = createMockConfigService()
			service = new MailService(mockConfigService as unknown as ConfigService)
			sendEmailSpy = jest.spyOn(service, "sendEmail").mockResolvedValue(undefined)
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it("sends one email with cc when multiple players", async () => {
			const players = [
				{ firstName: "John", email: "john@example.com" },
				{ firstName: "Jane", email: "jane@example.com" },
				{ firstName: "Bob", email: "bob@example.com" },
			]

			await service.sendMoveNotification(players, event, "Hole 1", "Hole 7")

			expect(sendEmailSpy).toHaveBeenCalledTimes(1)
			expect(sendEmailSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					to: "john@example.com",
					cc: ["jane@example.com", "bob@example.com"],
					subject: "Tee Time Change: Test Event",
				}),
			)
		})

		it("sends one email with no cc for a single player", async () => {
			const players = [{ firstName: "John", email: "john@example.com" }]

			await service.sendMoveNotification(players, event, "Hole 1", "Hole 7")

			expect(sendEmailSpy).toHaveBeenCalledTimes(1)
			const callArgs = sendEmailSpy.mock.calls[0][0]
			expect(callArgs.to).toBe("john@example.com")
			expect(callArgs.cc).toBeUndefined()
		})

		it("does not send email for empty players array", async () => {
			await service.sendMoveNotification([], event, "Hole 1", "Hole 7")

			expect(sendEmailSpy).not.toHaveBeenCalled()
		})
	})
})
