import { RegistrationStatusChoices, EventTypeChoices } from "@repo/domain/types"
import type { ClubEvent } from "@repo/domain/types"

import { AdminRegistrationService } from "../services/admin-registration.service"
import type { RegistrationRow, RegistrationSlotRow, RegistrationFeeRow } from "../../database"

// =============================================================================
// Test Fixtures
// =============================================================================

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
	status: RegistrationStatusChoices.AWAITING_PAYMENT,
	ggId: null,
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
	starterTimeInterval: 10,
	teamSize: 4,
	ageRestrictionType: "N",
	...overrides,
})

const createRegistrationFeeRow = (
	overrides: Partial<RegistrationFeeRow> = {},
): RegistrationFeeRow => ({
	id: 1,
	eventFeeId: 1,
	paymentId: 1,
	registrationSlotId: 1,
	isPaid: 0,
	amount: "25.00",
	...overrides,
})

// =============================================================================
// Mock Setup
// =============================================================================

const createMockRegistrationRepository = () => ({
	findRegistrationById: jest.fn(),
	findRegistrationSlotsByRegistrationId: jest.fn(),
	updateRegistrationSlots: jest.fn(),
	deleteRegistrationSlots: jest.fn(),
})

const createMockPaymentsRepository = () => ({
	updatePayment: jest.fn(),
	findPaymentDetailsByPayment: jest.fn(),
	updatePaymentDetailStatus: jest.fn(),
})

const createMockEventsService = () => ({
	getEventById: jest.fn(),
})

const createMockBroadcastService = () => ({
	notifyChange: jest.fn(),
})

const createMockAuthService = () => ({
	findById: jest.fn(),
})

const createMockCoursesService = () => ({
	findCourseWithHolesById: jest.fn(),
})

const createMocks = () => ({
	repository: createMockRegistrationRepository(),
	paymentsRepository: createMockPaymentsRepository(),
	auth: createMockAuthService(),
	courses: createMockCoursesService(),
	events: createMockEventsService(),
	broadcast: createMockBroadcastService(),
	drizzle: {},
	mailService: {},
	stripeService: {},
})

const createService = (mocks: ReturnType<typeof createMocks>) =>
	new AdminRegistrationService(
		mocks.drizzle as any,
		mocks.repository as any,
		mocks.paymentsRepository as any,
		mocks.auth as any,
		mocks.courses as any,
		mocks.events as any,
		mocks.mailService as any,
		mocks.stripeService as any,
		mocks.broadcast as any,
	)

// =============================================================================
// Tests
// =============================================================================

describe("AdminRegistrationService", () => {
	describe("paymentConfirmed", () => {
		it("throws when registration not found", async () => {
			const mocks = createMocks()
			mocks.repository.findRegistrationById.mockResolvedValue(null)
			const service = createService(mocks)

			await expect(service.paymentConfirmed(999, 1)).rejects.toThrow(
				"Inconceivable! No registration found for id 999 in the webhook flow.",
			)
		})

		it("updates slots with status=AWAITING_PAYMENT and playerId to RESERVED", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })
			const slots = [
				createRegistrationSlotRow({
					id: 10,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: 1,
				}),
				createRegistrationSlotRow({
					id: 11,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: 2,
				}),
			]

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue(slots)
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: false }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.repository.updateRegistrationSlots).toHaveBeenCalledWith([10, 11], {
				status: RegistrationStatusChoices.RESERVED,
			})
		})

		it("ignores slots without playerId when updating to RESERVED", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })
			const slots = [
				createRegistrationSlotRow({
					id: 10,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: 1,
				}),
				createRegistrationSlotRow({
					id: 11,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: null,
				}),
			]

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue(slots)
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: false }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.repository.updateRegistrationSlots).toHaveBeenCalledWith([10], {
				status: RegistrationStatusChoices.RESERVED,
			})
		})

		it("does not update slots when none have AWAITING_PAYMENT status with player", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })
			const slots = [
				createRegistrationSlotRow({
					id: 10,
					status: RegistrationStatusChoices.RESERVED,
					playerId: 1,
				}),
			]

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue(slots)
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: false }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.repository.updateRegistrationSlots).not.toHaveBeenCalledWith(expect.anything(), {
				status: RegistrationStatusChoices.RESERVED,
			})
		})

		it("marks payment as confirmed with date", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue([])
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: false }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.paymentsRepository.updatePayment).toHaveBeenCalledWith(5, {
				confirmed: 1,
				confirmDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
			})
		})

		it("marks fee details as paid", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })
			const fees = [createRegistrationFeeRow({ id: 20 }), createRegistrationFeeRow({ id: 21 })]

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue([])
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue(fees)
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: false }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.paymentsRepository.updatePaymentDetailStatus).toHaveBeenCalledWith(
				[20, 21],
				true,
			)
		})

		it("resets unassigned slots to AVAILABLE for canChoose events", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })
			const slots = [
				createRegistrationSlotRow({
					id: 10,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: 1,
				}),
				createRegistrationSlotRow({
					id: 11,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: null,
				}),
				createRegistrationSlotRow({
					id: 12,
					status: RegistrationStatusChoices.PENDING,
					playerId: null,
				}),
			]

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue(slots)
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: true }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.repository.updateRegistrationSlots).toHaveBeenCalledWith([11, 12], {
				status: RegistrationStatusChoices.AVAILABLE,
				registrationId: null,
			})
		})

		it("deletes unassigned slots for non-canChoose events", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })
			const slots = [
				createRegistrationSlotRow({
					id: 10,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: 1,
				}),
				createRegistrationSlotRow({
					id: 11,
					status: RegistrationStatusChoices.AWAITING_PAYMENT,
					playerId: null,
				}),
			]

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue(slots)
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: false }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.repository.deleteRegistrationSlots).toHaveBeenCalledWith([11])
		})

		it("broadcasts change for canChoose events", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue([])
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: true }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.broadcast.notifyChange).toHaveBeenCalledWith(100)
		})

		it("does not broadcast for non-canChoose events", async () => {
			const mocks = createMocks()
			const reg = createRegistrationRow({ id: 1, eventId: 100 })

			mocks.repository.findRegistrationById.mockResolvedValue(reg)
			mocks.repository.findRegistrationSlotsByRegistrationId.mockResolvedValue([])
			mocks.paymentsRepository.findPaymentDetailsByPayment.mockResolvedValue([])
			mocks.events.getEventById.mockResolvedValue(createClubEvent({ canChoose: false }))

			const service = createService(mocks)
			await service.paymentConfirmed(1, 5)

			expect(mocks.broadcast.notifyChange).not.toHaveBeenCalled()
		})
	})
})
