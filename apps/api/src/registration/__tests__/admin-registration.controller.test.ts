import { ForbiddenException } from "@nestjs/common"
import type { DjangoUser } from "@repo/domain/types"

import { AdminRegistrationController } from "../controllers/admin-registration.controller"

// =============================================================================
// Test Fixtures
// =============================================================================

const createUser = (overrides: Partial<DjangoUser> = {}): DjangoUser => ({
	id: 10,
	firstName: "John",
	lastName: "Doe",
	email: "john@example.com",
	playerId: 1,
	isStaff: false,
	isActive: true,
	isSuperuser: false,
	ghin: null,
	birthDate: null,
	...overrides,
})

// =============================================================================
// Mock Setup
// =============================================================================

const createMockAdminRegistrationService = () => ({
	createAdminRegistration: jest.fn(),
	sendAdminRegistrationNotification: jest.fn(),
})

const createMockPlayerService = () => ({
	dropPlayers: jest.fn(),
	searchPlayers: jest.fn(),
	findGroups: jest.fn(),
	findGroup: jest.fn(),
	getRegisteredPlayers: jest.fn(),
	getAvailableSlots: jest.fn(),
	reserveSlots: jest.fn(),
	replacePlayer: jest.fn(),
	movePlayers: jest.fn(),
	swapPlayers: jest.fn(),
	updateNotes: jest.fn(),
})

const createMockPaymentsService = () => ({
	findPaidFeesBySlotIds: jest.fn(),
})

const createMockRefundService = () => ({
	processRefunds: jest.fn(),
})

const createMockRegistrationService = () => ({
	findRegistrationById: jest.fn(),
	findSlotById: jest.fn(),
	getAvailableSpots: jest.fn(),
})

function createController() {
	const adminRegistrationService = createMockAdminRegistrationService()
	const playerService = createMockPlayerService()
	const paymentsService = createMockPaymentsService()
	const refundService = createMockRefundService()
	const registrationService = createMockRegistrationService()

	const controller = new AdminRegistrationController(
		adminRegistrationService as any,
		playerService as any,
		paymentsService as any,
		refundService as any,
		registrationService as any,
	)

	return {
		controller,
		adminRegistrationService,
		playerService,
		paymentsService,
		refundService,
		registrationService,
	}
}

// =============================================================================
// Tests
// =============================================================================

describe("AdminRegistrationController", () => {
	describe("dropPlayers", () => {
		const dropRequest = { registrationId: 42, slotIds: [101, 102] }

		it("non-admin user: collects paid fees, drops, then processes refunds", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findRegistrationById.mockResolvedValue({ id: 42 })
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([
				{ id: 10, paymentId: 1 },
				{ id: 11, paymentId: 1 },
				{ id: 12, paymentId: 2 },
			])
			playerService.dropPlayers.mockResolvedValue(2)
			refundService.processRefunds.mockResolvedValue(undefined)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42, 1)
			expect(paymentsService.findPaidFeesBySlotIds).toHaveBeenCalledWith([101, 102])
			expect(playerService.dropPlayers).toHaveBeenCalledWith(42, [101, 102])
			expect(refundService.processRefunds).toHaveBeenCalledWith(
				expect.arrayContaining([
					{ paymentId: 1, registrationFeeIds: [10, 11] },
					{ paymentId: 2, registrationFeeIds: [12] },
				]),
				10,
			)
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("non-admin user with no paid fees: drops without calling refund", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findRegistrationById.mockResolvedValue({ id: 42 })
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([])
			playerService.dropPlayers.mockResolvedValue(1)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(paymentsService.findPaidFeesBySlotIds).toHaveBeenCalledWith([101, 102])
			expect(refundService.processRefunds).not.toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 1 })
		})

		it("admin user: drops without collecting fees or processing refunds", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser({ isStaff: true })
			const req = { user } as any

			playerService.dropPlayers.mockResolvedValue(2)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(registrationService.findRegistrationById).not.toHaveBeenCalled()
			expect(paymentsService.findPaidFeesBySlotIds).not.toHaveBeenCalled()
			expect(refundService.processRefunds).not.toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("superuser: drops without collecting fees or processing refunds", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser({ isSuperuser: true })
			const req = { user } as any

			playerService.dropPlayers.mockResolvedValue(2)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(registrationService.findRegistrationById).not.toHaveBeenCalled()
			expect(paymentsService.findPaidFeesBySlotIds).not.toHaveBeenCalled()
			expect(refundService.processRefunds).not.toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("refund failure after successful drop: logs error, still returns droppedCount", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findRegistrationById.mockResolvedValue({ id: 42 })
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([{ id: 10, paymentId: 1 }])
			playerService.dropPlayers.mockResolvedValue(2)
			refundService.processRefunds.mockRejectedValue(new Error("Stripe failure"))

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(refundService.processRefunds).toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("non-admin ownership validation: calls findRegistrationById with playerId", async () => {
			const { controller, registrationService } = createController()
			const user = createUser({ playerId: 5 })
			const req = { user } as any

			registrationService.findRegistrationById.mockRejectedValue(
				new ForbiddenException("Not authorized"),
			)

			await expect(controller.dropPlayers(100, dropRequest, req)).rejects.toThrow(
				ForbiddenException,
			)

			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42, 5)
		})
	})
})
