import { EventsService } from "../../events"
import { PaymentsRepository } from "../repositories/payments.repository"
import { RegistrationRepository } from "../repositories/registration.repository"
import { ChangeLogService } from "../services/changelog.service"
import { CleanupService } from "../services/cleanup.service"
import { RegistrationBroadcastService } from "../services/registration-broadcast.service"

const createMockRepository = () => ({
	findExpiredPendingRegistrations: jest.fn(),
	updateRegistrationSlots: jest.fn().mockResolvedValue(undefined),
	deleteRegistrationSlots: jest.fn().mockResolvedValue(undefined),
	deleteRegistration: jest.fn().mockResolvedValue(undefined),
	updateRegistration: jest.fn().mockResolvedValue(undefined),
})

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
