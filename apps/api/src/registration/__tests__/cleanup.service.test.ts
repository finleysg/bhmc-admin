import { EventsService } from "../../events"
import { PaymentsRepository } from "../repositories/payments.repository"
import { RegistrationRepository } from "../repositories/registration.repository"
import { ChangeLogService } from "../services/changelog.service"
import { CleanupService } from "../services/cleanup.service"
import { RegistrationBroadcastService } from "../services/registration-broadcast.service"

const createMockRepository = () => {
	// findRegistrationSlotsByIds is used by releaseSlots' RESERVED-skip guard.
	// Default: synthesize matching slots with PENDING status so existing tests
	// (which exercise PENDING/expired flows) pass without explicit setup.
	const findRegistrationSlotsByIds = jest.fn((ids: number[]) =>
		Promise.resolve(ids.map((id) => ({ id, status: "P" }))),
	)
	return {
		findExpiredPendingRegistrations: jest.fn(),
		findRegistrationSlotsByIds,
		findRegistrationSlotsByRegistrationId: jest.fn().mockResolvedValue([]),
		updateRegistrationSlots: jest.fn().mockResolvedValue(undefined),
		deleteRegistrationSlots: jest.fn().mockResolvedValue(undefined),
		deleteRegistration: jest.fn().mockResolvedValue(undefined),
		updateRegistration: jest.fn().mockResolvedValue(undefined),
	}
}

const createMockPaymentsRepository = () => ({
	findPaymentsForRegistration: jest.fn().mockResolvedValue([]),
	deletePaymentDetailsByPayment: jest.fn().mockResolvedValue(undefined),
	deletePayment: jest.fn().mockResolvedValue(undefined),
})

const createMockEventsService = () => ({
	isCanChooseHolesEvent: jest.fn().mockResolvedValue(false),
})

const createMockChangeLogService = () => ({
	resolvePlayerNames: jest.fn().mockResolvedValue([]),
	log: jest.fn().mockResolvedValue(undefined),
})

const createMockBroadcastService = () => ({
	notifyChange: jest.fn(),
})

function makeExpiredRegistration(overrides: Record<string, unknown> = {}) {
	return {
		id: 10,
		eventId: 100,
		userId: 5,
		expires: "2026-03-01 12:00:00.000000",
		courseId: null,
		notes: null,
		signedUpBy: null,
		createdDate: "2026-03-01 11:00:00.000000",
		ggId: null,
		slots: [
			{
				id: 1,
				playerId: 20,
				status: "P",
				startingOrder: 0,
				slot: 0,
				eventId: 100,
				holeId: null,
				registrationId: 10,
				ggId: null,
			},
			{
				id: 2,
				playerId: 21,
				status: "P",
				startingOrder: 0,
				slot: 1,
				eventId: 100,
				holeId: null,
				registrationId: 10,
				ggId: null,
			},
		],
		...overrides,
	}
}

describe("CleanupService", () => {
	let service: CleanupService
	let mockRepository: ReturnType<typeof createMockRepository>
	let mockPaymentsRepository: ReturnType<typeof createMockPaymentsRepository>
	let mockEventsService: ReturnType<typeof createMockEventsService>
	let mockChangeLogService: ReturnType<typeof createMockChangeLogService>
	let mockBroadcastService: ReturnType<typeof createMockBroadcastService>

	beforeEach(() => {
		mockRepository = createMockRepository()
		mockPaymentsRepository = createMockPaymentsRepository()
		mockEventsService = createMockEventsService()
		mockChangeLogService = createMockChangeLogService()
		mockBroadcastService = createMockBroadcastService()
		service = new CleanupService(
			mockRepository as unknown as RegistrationRepository,
			mockPaymentsRepository as unknown as PaymentsRepository,
			mockEventsService as unknown as EventsService,
			mockChangeLogService as unknown as ChangeLogService,
			mockBroadcastService as unknown as RegistrationBroadcastService,
		)
	})

	it("returns 0 when no expired registrations found", async () => {
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([])

		const count = await service.cleanUpExpired()

		expect(count).toBe(0)
		expect(mockChangeLogService.log).not.toHaveBeenCalled()
	})

	it("logs expired action with resolved player names", async () => {
		const reg = makeExpiredRegistration()
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([reg])
		mockChangeLogService.resolvePlayerNames.mockResolvedValue(["John Doe", "Jane Smith"])

		await service.cleanUpExpired()

		expect(mockChangeLogService.resolvePlayerNames).toHaveBeenCalledWith([20, 21])
		expect(mockChangeLogService.log).toHaveBeenCalledWith({
			eventId: 100,
			registrationId: 10,
			action: "expired",
			actorId: 5,
			isAdmin: false,
			details: { players: ["John Doe", "Jane Smith"] },
		})
	})

	it("updates registration instead of deleting it", async () => {
		const reg = makeExpiredRegistration()
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([reg])

		await service.cleanUpExpired()

		expect(mockRepository.updateRegistration).toHaveBeenCalledWith(10, {
			userId: null,
			expires: null,
		})
		expect(mockRepository.deleteRegistration).not.toHaveBeenCalled()
	})

	it("resolves player names before releasing slots", async () => {
		const reg = makeExpiredRegistration()
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([reg])

		const callOrder: string[] = []
		mockChangeLogService.resolvePlayerNames.mockImplementation(() => {
			callOrder.push("resolvePlayerNames")
			return Promise.resolve(["John Doe"])
		})
		mockRepository.updateRegistrationSlots.mockImplementation(() => {
			callOrder.push("releaseSlots")
			return Promise.resolve(undefined)
		})
		mockRepository.deleteRegistrationSlots.mockImplementation(() => {
			callOrder.push("releaseSlots")
			return Promise.resolve(undefined)
		})

		await service.cleanUpExpired()

		expect(callOrder.indexOf("resolvePlayerNames")).toBeLessThan(callOrder.indexOf("releaseSlots"))
	})

	it("skips changelog when userId is null", async () => {
		const reg = makeExpiredRegistration({ userId: null })
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([reg])

		await service.cleanUpExpired()

		expect(mockChangeLogService.log).not.toHaveBeenCalled()
		expect(mockRepository.updateRegistration).toHaveBeenCalledWith(10, {
			userId: null,
			expires: null,
		})
	})

	it("handles choosable events with slot reset and broadcast", async () => {
		const reg = makeExpiredRegistration()
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([reg])
		mockEventsService.isCanChooseHolesEvent.mockResolvedValue(true)

		await service.cleanUpExpired()

		expect(mockRepository.updateRegistrationSlots).toHaveBeenCalledWith([1, 2], {
			status: "A",
			registrationId: null,
			playerId: null,
		})
		expect(mockRepository.deleteRegistrationSlots).not.toHaveBeenCalled()
		expect(mockBroadcastService.notifyChange).toHaveBeenCalledWith(100)
	})

	it("handles non-choosable events with slot deletion", async () => {
		const reg = makeExpiredRegistration()
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([reg])
		mockEventsService.isCanChooseHolesEvent.mockResolvedValue(false)

		await service.cleanUpExpired()

		expect(mockRepository.deleteRegistrationSlots).toHaveBeenCalledWith([1, 2])
		expect(mockRepository.updateRegistrationSlots).not.toHaveBeenCalled()
		expect(mockBroadcastService.notifyChange).not.toHaveBeenCalled()
	})

	describe("releaseSlots RESERVED guard", () => {
		it("skips RESERVED slots when releasing for a choosable event", async () => {
			mockRepository.findRegistrationSlotsByIds.mockResolvedValue([
				{ id: 1, status: "X" }, // AWAITING_PAYMENT
				{ id: 2, status: "R" }, // RESERVED — must be skipped
				{ id: 3, status: "P" }, // PENDING
			])

			await service.releaseSlots([1, 2, 3], true)

			expect(mockRepository.updateRegistrationSlots).toHaveBeenCalledWith([1, 3], {
				status: "A",
				registrationId: null,
				playerId: null,
			})
		})

		it("skips RESERVED slots when releasing for a non-choosable event", async () => {
			mockRepository.findRegistrationSlotsByIds.mockResolvedValue([
				{ id: 1, status: "P" },
				{ id: 2, status: "R" },
			])

			await service.releaseSlots([1, 2], false)

			expect(mockRepository.deleteRegistrationSlots).toHaveBeenCalledWith([1])
			expect(mockRepository.updateRegistrationSlots).not.toHaveBeenCalled()
		})

		it("returns early when every slot is RESERVED", async () => {
			mockRepository.findRegistrationSlotsByIds.mockResolvedValue([
				{ id: 1, status: "R" },
				{ id: 2, status: "R" },
			])

			await service.releaseSlots([1, 2], true)

			expect(mockRepository.updateRegistrationSlots).not.toHaveBeenCalled()
			expect(mockRepository.deleteRegistrationSlots).not.toHaveBeenCalled()
		})

		it("releaseSlotsByRegistration routes through releaseSlots so RESERVED is skipped", async () => {
			mockRepository.findRegistrationSlotsByRegistrationId.mockResolvedValue([
				{ id: 11, status: "R" },
				{ id: 12, status: "P" },
			])
			mockRepository.findRegistrationSlotsByIds.mockResolvedValue([
				{ id: 11, status: "R" },
				{ id: 12, status: "P" },
			])

			await service.releaseSlotsByRegistration(7, false)

			expect(mockRepository.deleteRegistrationSlots).toHaveBeenCalledWith([12])
		})
	})

	it("filters out null playerIds when resolving names", async () => {
		const reg = makeExpiredRegistration({
			slots: [
				{
					id: 1,
					playerId: 20,
					status: "P",
					startingOrder: 0,
					slot: 0,
					eventId: 100,
					holeId: null,
					registrationId: 10,
					ggId: null,
				},
				{
					id: 2,
					playerId: null,
					status: "P",
					startingOrder: 0,
					slot: 1,
					eventId: 100,
					holeId: null,
					registrationId: 10,
					ggId: null,
				},
			],
		})
		mockRepository.findExpiredPendingRegistrations.mockResolvedValue([reg])
		mockChangeLogService.resolvePlayerNames.mockResolvedValue(["John Doe"])

		await service.cleanUpExpired()

		expect(mockChangeLogService.resolvePlayerNames).toHaveBeenCalledWith([20])
	})
})
