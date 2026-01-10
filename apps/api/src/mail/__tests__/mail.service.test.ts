import { ConfigService } from "@nestjs/config"
import {
	ClubEvent,
	CompleteRegistration,
	CompleteRegistrationSlot,
	EventTypeChoices,
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

		describe("Non-SEASON_REGISTRATION events", () => {
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
})
