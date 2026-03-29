import { ConfigService } from "@nestjs/config"

import { MailService } from "../../mail"
import { RegistrationRepository } from "../repositories/registration.repository"
import { StalePaymentService } from "../services/stale-payment.service"

const createMockRepository = () => ({
	findStalePaymentProcessingRegistrations: jest.fn(),
	resetStaleRegistrations: jest.fn().mockResolvedValue(undefined),
})

const createMockMailService = () => ({
	sendStalePaymentNotification: jest.fn().mockResolvedValue(undefined),
})

const createMockConfigService = () => ({
	getOrThrow: jest.fn().mockImplementation((key: string) => {
		if (key === "ADMIN_NOTIFICATION_EMAIL") return "admin@bhmc.org"
		return ""
	}),
})

describe("StalePaymentService", () => {
	let service: StalePaymentService
	let mockRepository: ReturnType<typeof createMockRepository>
	let mockMailService: ReturnType<typeof createMockMailService>
	let mockConfigService: ReturnType<typeof createMockConfigService>

	beforeEach(() => {
		mockRepository = createMockRepository()
		mockMailService = createMockMailService()
		mockConfigService = createMockConfigService()
		service = new StalePaymentService(
			mockRepository as unknown as RegistrationRepository,
			mockMailService as unknown as MailService,
			mockConfigService as unknown as ConfigService,
		)
	})

	it("returns 0 and sends no emails when no stale registrations found", async () => {
		mockRepository.findStalePaymentProcessingRegistrations.mockResolvedValue([])

		const count = await service.notifyStalePayments()

		expect(count).toBe(0)
		expect(mockMailService.sendStalePaymentNotification).not.toHaveBeenCalled()
		expect(mockRepository.resetStaleRegistrations).not.toHaveBeenCalled()
	})

	it("sends notification for each stale registration", async () => {
		mockRepository.findStalePaymentProcessingRegistrations.mockResolvedValue([
			{
				registrationId: 1,
				eventName: "Wednesday Event",
				eventDate: "2026-06-15",
				paymentUserEmail: "john@example.com",
				createdDate: "2026-06-15 08:00:00",
				paymentCode: "pi_abc123",
			},
			{
				registrationId: 2,
				eventName: "Saturday Major",
				eventDate: "2026-06-20",
				paymentUserEmail: "jane@example.com",
				createdDate: "2026-06-20 09:30:00",
				paymentCode: null,
			},
		])

		const count = await service.notifyStalePayments()

		expect(count).toBe(2)
		expect(mockMailService.sendStalePaymentNotification).toHaveBeenCalledTimes(2)
		expect(mockRepository.resetStaleRegistrations).toHaveBeenCalledWith([1, 2])
	})

	it("deduplicates recipients when payment user email matches admin email", async () => {
		mockRepository.findStalePaymentProcessingRegistrations.mockResolvedValue([
			{
				registrationId: 1,
				eventName: "Wednesday Event",
				eventDate: "2026-06-15",
				paymentUserEmail: "admin@bhmc.org",
				createdDate: "2026-06-15 08:00:00",
				paymentCode: "pi_xyz789",
			},
		])

		await service.notifyStalePayments()

		expect(mockMailService.sendStalePaymentNotification).toHaveBeenCalledWith(
			["admin@bhmc.org"],
			expect.any(Object),
		)
	})

	it("includes both admin and payment user emails as recipients", async () => {
		mockRepository.findStalePaymentProcessingRegistrations.mockResolvedValue([
			{
				registrationId: 1,
				eventName: "Wednesday Event",
				eventDate: "2026-06-15",
				paymentUserEmail: "john@example.com",
				createdDate: "2026-06-15 08:00:00",
				paymentCode: "pi_def456",
			},
		])

		await service.notifyStalePayments()

		expect(mockMailService.sendStalePaymentNotification).toHaveBeenCalledWith(
			["admin@bhmc.org", "john@example.com"],
			expect.objectContaining({
				eventName: "Wednesday Event",
			}),
		)
	})

	it("continues sending when one notification fails", async () => {
		mockRepository.findStalePaymentProcessingRegistrations.mockResolvedValue([
			{
				registrationId: 1,
				eventName: "Event 1",
				eventDate: "2026-06-15",
				paymentUserEmail: "john@example.com",
				createdDate: "2026-06-15 08:00:00",
				paymentCode: "pi_fail123",
			},
			{
				registrationId: 2,
				eventName: "Event 2",
				eventDate: "2026-06-20",
				paymentUserEmail: "jane@example.com",
				createdDate: "2026-06-20 09:30:00",
				paymentCode: null,
			},
		])

		mockMailService.sendStalePaymentNotification
			.mockRejectedValueOnce(new Error("SMTP error"))
			.mockResolvedValueOnce(undefined)

		const count = await service.notifyStalePayments()

		expect(count).toBe(2)
		expect(mockMailService.sendStalePaymentNotification).toHaveBeenCalledTimes(2)
		expect(mockRepository.resetStaleRegistrations).toHaveBeenCalledWith([1, 2])
	})
})
