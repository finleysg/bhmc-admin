import { RegistrationBroadcastService } from "../services/registration-broadcast.service"
import { firstValueFrom, take } from "rxjs"
import { ClubEvent } from "@repo/domain/types"

// Mock services
const createMockDataService = () => ({
	getSlotsWithWaveInfo: jest.fn().mockResolvedValue([
		{ id: 1, status: "A", player: null },
		{ id: 2, status: "P", player: { id: 1, firstName: "John" } },
	]),
})

const mockEvent: Partial<ClubEvent> = {
	id: 1,
	canChoose: true,
	signupWaves: null,
	prioritySignupStart: null,
	signupStart: null,
}

const createMockEventsService = () => ({
	getEventById: jest.fn().mockResolvedValue(mockEvent),
})

function createService() {
	const dataService = createMockDataService()
	const eventsService = createMockEventsService()

	const service = new RegistrationBroadcastService(dataService as any, eventsService as any)

	return { service, dataService, eventsService }
}

describe("RegistrationBroadcastService", () => {
	let activeService: RegistrationBroadcastService | null = null

	beforeEach(() => {
		jest.useFakeTimers()
	})

	afterEach(() => {
		activeService?.onModuleDestroy()
		activeService = null
		jest.clearAllTimers()
		jest.useRealTimers()
		jest.clearAllMocks()
	})

	describe("subscribe", () => {
		it("creates a new stream for an event", async () => {
			const { service, dataService } = createService()
			activeService = service

			const subscription = service.subscribe(1)
			expect(subscription).toBeDefined()

			// Start waiting for emission, then advance timers past debounce
			const promise = firstValueFrom(subscription.pipe(take(1)))
			jest.advanceTimersByTime(2100)

			const event = await promise
			expect(event.eventId).toBe(1)
			expect(event.slots).toHaveLength(2)
			expect(dataService.getSlotsWithWaveInfo).toHaveBeenCalledWith(1, mockEvent)
		})

		it("creates separate streams for different events", async () => {
			const { service, dataService } = createService()
			activeService = service

			const sub1 = service.subscribe(1)
			const sub2 = service.subscribe(2)

			const promise1 = firstValueFrom(sub1.pipe(take(1)))
			const promise2 = firstValueFrom(sub2.pipe(take(1)))
			jest.advanceTimersByTime(2100)

			await promise1
			await promise2

			expect(dataService.getSlotsWithWaveInfo).toHaveBeenCalledWith(1, mockEvent)
			expect(dataService.getSlotsWithWaveInfo).toHaveBeenCalledWith(2, mockEvent)
		})
	})

	describe("notifyChange", () => {
		it("does nothing for events with no subscribers", () => {
			const { service, dataService } = createService()
			activeService = service

			// Should not throw
			service.notifyChange(999)

			expect(dataService.getSlotsWithWaveInfo).not.toHaveBeenCalled()
		})
	})

	describe("onModuleDestroy", () => {
		it("cleans up all streams", () => {
			const { service } = createService()
			activeService = service

			service.subscribe(1)
			service.subscribe(2)

			// Should not throw - afterEach will also call this
			service.onModuleDestroy()
		})
	})
})
