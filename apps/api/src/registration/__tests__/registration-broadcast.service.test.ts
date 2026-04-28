import {
	RegistrationBroadcastService,
	type RegistrationUpdateEvent,
} from "../services/registration-broadcast.service"
import { firstValueFrom, take } from "rxjs"
import { ClubEvent } from "@repo/domain/types"

// Flush queued microtasks so async operators (from(promise), catchError) settle.
async function flushMicrotasks(rounds = 5) {
	for (let i = 0; i < rounds; i++) {
		await Promise.resolve()
	}
}

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
			jest.advanceTimersByTime(600)

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
			jest.advanceTimersByTime(600)

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

	describe("version", () => {
		it("increments monotonically across successful emissions", async () => {
			const { service } = createService()
			activeService = service

			const events: RegistrationUpdateEvent[] = []
			const sub = service.subscribe(1).subscribe((e) => events.push(e))

			// First emission (from startWith) — trailing-edge fires after THROTTLE_MS.
			jest.advanceTimersByTime(600)
			await flushMicrotasks()

			service.notifyChange(1)
			jest.advanceTimersByTime(600)
			await flushMicrotasks()

			service.notifyChange(1)
			jest.advanceTimersByTime(600)
			await flushMicrotasks()

			sub.unsubscribe()
			expect(events.map((e) => e.version)).toEqual([1, 2, 3])
		})

		it("does not increment version when build fails, and stream survives", async () => {
			const { service, dataService } = createService()
			activeService = service

			// First call fails; subsequent calls succeed.
			dataService.getSlotsWithWaveInfo
				.mockRejectedValueOnce(new Error("db blew up"))
				.mockResolvedValue([{ id: 1, status: "A", player: null }])

			const events: RegistrationUpdateEvent[] = []
			const sub = service.subscribe(1).subscribe((e) => events.push(e))

			// Trigger the first (failing) build.
			jest.advanceTimersByTime(600)
			await flushMicrotasks()

			// Stream is still alive; trigger two more successful builds.
			service.notifyChange(1)
			jest.advanceTimersByTime(600)
			await flushMicrotasks()

			service.notifyChange(1)
			jest.advanceTimersByTime(600)
			await flushMicrotasks()

			sub.unsubscribe()
			// First successful build is version 1 (failed build did not increment),
			// and the stream kept emitting after the catchError → EMPTY recovery.
			expect(events.map((e) => e.version)).toEqual([1, 2])
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
