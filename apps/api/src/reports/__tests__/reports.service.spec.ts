import { EventReportRowDto } from "@repo/dto"

import { CoursesService } from "../../courses"
import { DrizzleService } from "../../database"
import { EventsDomainService, EventsService } from "../../events"
import { RegistrationDomainService, RegistrationService } from "../../registration"
import { createWorkbook, deriveDynamicColumns, generateBuffer } from "../excel.utils"
import { ReportsService } from "../reports.service"

describe("ReportsService", () => {
	let service: ReportsService
	let eventsService: jest.Mocked<EventsService>

	beforeEach(() => {
		eventsService = {
			findEventById: jest.fn(),
		} as Partial<EventsService> as jest.Mocked<EventsService>

		const drizzleService = {
			db: {},
		} as Partial<DrizzleService> as jest.Mocked<DrizzleService>

		const registrationService =
			{} as Partial<RegistrationService> as jest.Mocked<RegistrationService>
		const coursesService = {} as Partial<CoursesService> as jest.Mocked<CoursesService>
		const eventsDomainService =
			{} as Partial<EventsDomainService> as jest.Mocked<EventsDomainService>
		const registrationDomainService =
			{} as Partial<RegistrationDomainService> as jest.Mocked<RegistrationDomainService>

		service = new ReportsService(
			eventsService,
			registrationService as RegistrationService,
			coursesService as CoursesService,
			eventsDomainService as EventsDomainService,
			registrationDomainService as RegistrationDomainService,
			drizzleService as DrizzleService,
		)
	})

	describe("validateEvent", () => {
		it("should not throw when event exists", async () => {
			eventsService.findEventById.mockResolvedValue({ id: 1, name: "Test Event" } as never)

			await expect(service["validateEvent"](1)).resolves.not.toThrow()
		})

		it("should throw when event does not exist", async () => {
			eventsService.findEventById.mockResolvedValue(null)

			await expect(service["validateEvent"](1)).rejects.toThrow("Event 1 not found")
		})
	})

	describe("Excel Utils", () => {
		it("should create workbook", async () => {
			const workbook = await createWorkbook()
			expect(workbook).toBeDefined()
		})

		it("should derive dynamic columns", () => {
			const rows: EventReportRowDto[] = [
				{
					teamId: "A",
					course: "Course 1",
					start: "10:00",
					ghin: "123",
					age: "30",
					tee: "Blue",
					lastName: "Doe",
					firstName: "John",
					fullName: "John Doe",
					email: "john@example.com",
					signedUpBy: "Jane",
					signupDate: "2023-01-01",
					entryFee: "50",
				},
			]
			const fixedKeys = [
				"teamId",
				"course",
				"start",
				"ghin",
				"age",
				"tee",
				"lastName",
				"firstName",
				"fullName",
				"email",
				"signedUpBy",
				"signupDate",
			]
			const dynamicColumns = deriveDynamicColumns(rows, fixedKeys)

			expect(dynamicColumns).toEqual([{ header: "Entry Fee", key: "entryFee", width: 12 }])
		})

		it("should generate buffer from workbook", async () => {
			const workbook = await createWorkbook()
			const worksheet = workbook.addWorksheet("Test")
			worksheet.addRow(["Test"])

			const buffer = await generateBuffer(workbook)
			expect(Buffer.isBuffer(buffer)).toBe(true)
			expect(buffer.length).toBeGreaterThan(0)
		})
	})
})
