import { CoursesService } from "../../courses/courses.service"
import { RegistrationService } from "../../registration/registration.service"
import { EventsController } from "../events.controller"
import { EventsService } from "../events.service"

describe("EventsController closeEvent", () => {
	it("should call closeEvent service method and return result", async () => {
		const mockResult = {
			eventId: 1,
			resultsUpdated: 5,
			payoutDate: "2025-11-06 10:28:00",
		}

		const mockEvents = {
			closeEvent: jest.fn().mockResolvedValue(mockResult),
		} as Partial<EventsService>

		const mockRegistration = {} as Partial<RegistrationService>
		const mockCourses = {} as Partial<CoursesService>

		const controller = new EventsController(
			mockEvents as EventsService,
			mockRegistration as RegistrationService,
			mockCourses as CoursesService,
		)

		const result = await controller.closeEvent(1)

		expect(mockEvents.closeEvent).toHaveBeenCalledWith(1)
		expect(result).toEqual(mockResult)
	})
})

describe("EventsController getPlayersByEvent (canChoose = 0)", () => {
	it('returns course and start as "N/A" when event.canChoose is falsy', async () => {
		const mockEvents = {
			findEventById: jest.fn().mockResolvedValue({ id: 1, canChoose: 0 }),
			listEventFeesByEvent: jest.fn().mockResolvedValue([]),
		} as Partial<EventsService>

		const mockRegistration = {
			getRegisteredPlayers: jest.fn().mockResolvedValue([
				{
					slot: { id: 10, slot: 0, startingOrder: 0, holeId: null },
					player: {
						id: 20,
						firstName: "John",
						lastName: "Doe",
						ghin: "123",
						tee: "Blue",
						email: "john@example.com",
						birthDate: "1990-01-01",
					},
					registration: { id: 1, signedUpBy: "admin" },
					// course intentionally omitted for canChoose = 0
					fees: [],
				},
			]),
		} as Partial<RegistrationService>

		const mockCourses = {
			findHolesByCourseId: jest.fn(),
		} as Partial<CoursesService>

		const controller = new EventsController(
			mockEvents as EventsService,
			mockRegistration as RegistrationService,
			mockCourses as CoursesService,
		)
		const res = await controller.getPlayersByEvent(1)

		expect(res).toBeDefined()
		expect(res.total).toBe(1)
		expect(res.slots).toHaveLength(1)
		const slot = res.slots[0]
		expect(slot.course).toBe("N/A")
		expect(slot.start).toBe("N/A")
		expect(slot.fullName).toBe("John Doe")
		expect(slot.email).toBe("john@example.com")
	})
})
