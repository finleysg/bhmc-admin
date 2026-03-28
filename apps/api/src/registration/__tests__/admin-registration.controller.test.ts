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

const createMockEventsService = () => ({
	getEventById: jest.fn().mockResolvedValue({
		signupEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
	}),
})

const createMockChangeLogService = () => ({
	log: jest.fn(),
	resolvePlayerNames: jest.fn().mockResolvedValue([]),
	resolveRegistrationIdFromFeeId: jest.fn().mockResolvedValue(null),
	resolveRegistrationIdFromSlotId: jest.fn().mockResolvedValue(null),
})

function createController() {
	const adminRegistrationService = createMockAdminRegistrationService()
	const changeLogService = createMockChangeLogService()
	const playerService = createMockPlayerService()
	const paymentsService = createMockPaymentsService()
	const refundService = createMockRefundService()
	const registrationService = createMockRegistrationService()
	const eventsService = createMockEventsService()

	const controller = new AdminRegistrationController(
		adminRegistrationService as any,
		changeLogService as any,
		playerService as any,
		paymentsService as any,
		refundService as any,
		registrationService as any,
		eventsService as any,
	)

	return {
		controller,
		adminRegistrationService,
		changeLogService,
		playerService,
		paymentsService,
		refundService,
		registrationService,
		eventsService,
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

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([
				{ id: 10, paymentId: 1 },
				{ id: 11, paymentId: 1 },
				{ id: 12, paymentId: 2 },
			])
			playerService.dropPlayers.mockResolvedValue(2)
			refundService.processRefunds.mockResolvedValue(undefined)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42)
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

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
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

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			playerService.dropPlayers.mockResolvedValue(2)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(paymentsService.findPaidFeesBySlotIds).not.toHaveBeenCalled()
			expect(refundService.processRefunds).not.toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("superuser: drops without collecting fees or processing refunds", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser({ isSuperuser: true })
			const req = { user } as any

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			playerService.dropPlayers.mockResolvedValue(2)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(paymentsService.findPaidFeesBySlotIds).not.toHaveBeenCalled()
			expect(refundService.processRefunds).not.toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("admin user with autoRefund true: collects paid fees and processes refunds", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser({ isStaff: true })
			const req = { user } as any
			const dropWithRefund = { ...dropRequest, autoRefund: true }

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([{ id: 10, paymentId: 1 }])
			playerService.dropPlayers.mockResolvedValue(2)
			refundService.processRefunds.mockResolvedValue(undefined)

			const result = await controller.dropPlayers(100, dropWithRefund, req)

			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42)
			expect(paymentsService.findPaidFeesBySlotIds).toHaveBeenCalledWith([101, 102])
			expect(refundService.processRefunds).toHaveBeenCalledWith(
				[{ paymentId: 1, registrationFeeIds: [10] }],
				10,
			)
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("admin user with autoRefund false: skips refund even when explicitly set", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser({ isStaff: true })
			const req = { user } as any
			const dropNoRefund = { ...dropRequest, autoRefund: false }

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			playerService.dropPlayers.mockResolvedValue(2)

			const result = await controller.dropPlayers(100, dropNoRefund, req)

			expect(paymentsService.findPaidFeesBySlotIds).not.toHaveBeenCalled()
			expect(refundService.processRefunds).not.toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("non-admin user with autoRefund omitted: defaults to auto-refund", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([{ id: 10, paymentId: 1 }])
			playerService.dropPlayers.mockResolvedValue(1)
			refundService.processRefunds.mockResolvedValue(undefined)

			await controller.dropPlayers(100, dropRequest, req)

			expect(paymentsService.findPaidFeesBySlotIds).toHaveBeenCalled()
			expect(refundService.processRefunds).toHaveBeenCalled()
		})

		it("refund failure after successful drop: logs error, still returns droppedCount", async () => {
			const { controller, playerService, paymentsService, refundService, registrationService } =
				createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([{ id: 10, paymentId: 1 }])
			playerService.dropPlayers.mockResolvedValue(2)
			refundService.processRefunds.mockRejectedValue(new Error("Stripe failure"))

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(refundService.processRefunds).toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("non-admin user after signupEnd: drops without refund", async () => {
			const {
				controller,
				playerService,
				paymentsService,
				refundService,
				registrationService,
				eventsService,
			} = createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			eventsService.getEventById.mockResolvedValue({
				signupEnd: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
			})
			playerService.dropPlayers.mockResolvedValue(2)

			const result = await controller.dropPlayers(100, dropRequest, req)

			expect(paymentsService.findPaidFeesBySlotIds).not.toHaveBeenCalled()
			expect(refundService.processRefunds).not.toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("admin user with autoRefund true after signupEnd: still processes refunds", async () => {
			const {
				controller,
				playerService,
				paymentsService,
				refundService,
				registrationService,
				eventsService,
			} = createController()
			const user = createUser({ isStaff: true })
			const req = { user } as any
			const dropWithRefund = { ...dropRequest, autoRefund: true }

			registrationService.findRegistrationById.mockResolvedValue({
				id: 42,
				eventId: 100,
				slots: [
					{ id: 101, playerId: 1 },
					{ id: 102, playerId: 2 },
				],
			})
			eventsService.getEventById.mockResolvedValue({
				signupEnd: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
			})
			paymentsService.findPaidFeesBySlotIds.mockResolvedValue([{ id: 10, paymentId: 1 }])
			playerService.dropPlayers.mockResolvedValue(2)
			refundService.processRefunds.mockResolvedValue(undefined)

			const result = await controller.dropPlayers(100, dropWithRefund, req)

			expect(paymentsService.findPaidFeesBySlotIds).toHaveBeenCalledWith([101, 102])
			expect(refundService.processRefunds).toHaveBeenCalled()
			expect(result).toEqual({ droppedCount: 2 })
		})

		it("non-admin ownership validation: calls findRegistrationById with playerId", async () => {
			const { controller, registrationService } = createController()
			const user = createUser({ playerId: 5 })
			const req = { user } as any

			// First call (for changelog): succeeds
			registrationService.findRegistrationById
				.mockResolvedValueOnce({
					id: 42,
					eventId: 100,
					slots: [
						{ id: 101, playerId: 1 },
						{ id: 102, playerId: 2 },
					],
				})
				// Second call (for ownership validation): rejects
				.mockRejectedValueOnce(new ForbiddenException("Not authorized"))

			await expect(controller.dropPlayers(100, dropRequest, req)).rejects.toThrow(
				ForbiddenException,
			)

			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42, 5)
		})
	})

	describe("replacePlayer", () => {
		const replaceRequest = { slotId: 101, originalPlayerId: 1, replacementPlayerId: 2 }

		it("non-admin user: validates ownership then replaces player", async () => {
			const { controller, playerService, registrationService, changeLogService } =
				createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: 42 })
			registrationService.findRegistrationById.mockResolvedValue({ id: 42 })
			playerService.replacePlayer.mockResolvedValue({ slotId: 101 })
			changeLogService.resolvePlayerNames.mockResolvedValue(["Test Player"])

			const result = await controller.replacePlayer(100, replaceRequest, req)

			expect(registrationService.findSlotById).toHaveBeenCalledWith(101)
			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42, 1)
			expect(playerService.replacePlayer).toHaveBeenCalledWith(100, replaceRequest)
			expect(result).toEqual({ slotId: 101 })
		})

		it("admin user: skips ownership check and replaces player", async () => {
			const { controller, playerService, registrationService, changeLogService } =
				createController()
			const user = createUser({ isStaff: true })
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: 42 })
			playerService.replacePlayer.mockResolvedValue({ slotId: 101 })
			changeLogService.resolvePlayerNames.mockResolvedValue(["Test Player"])

			const result = await controller.replacePlayer(100, replaceRequest, req)

			expect(playerService.replacePlayer).toHaveBeenCalledWith(100, replaceRequest)
			expect(result).toEqual({ slotId: 101 })
		})

		it("non-admin with slot not in registration: throws ForbiddenException", async () => {
			const { controller, registrationService } = createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: null })

			await expect(controller.replacePlayer(100, replaceRequest, req)).rejects.toThrow(
				ForbiddenException,
			)
		})

		it("non-admin ownership failure: throws ForbiddenException", async () => {
			const { controller, registrationService } = createController()
			const user = createUser({ playerId: 5 })
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: 42 })
			registrationService.findRegistrationById.mockRejectedValue(
				new ForbiddenException("Not authorized"),
			)

			await expect(controller.replacePlayer(100, replaceRequest, req)).rejects.toThrow(
				ForbiddenException,
			)

			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42, 5)
		})
	})

	describe("movePlayers", () => {
		const moveRequest = {
			sourceSlotIds: [101, 102],
			destinationStartingHoleId: 200,
			destinationStartingOrder: 1,
		}

		it("non-admin user: validates ownership then moves players", async () => {
			const { controller, playerService, registrationService } = createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: 42 })
			registrationService.findRegistrationById.mockResolvedValue({ id: 42 })
			playerService.movePlayers.mockResolvedValue({ movedCount: 2 })

			const result = await controller.movePlayers(100, moveRequest, req)

			expect(registrationService.findSlotById).toHaveBeenCalledWith(101)
			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42, 1)
			expect(playerService.movePlayers).toHaveBeenCalledWith(100, moveRequest)
			expect(result).toEqual({ movedCount: 2 })
		})

		it("admin user: skips ownership check and moves players", async () => {
			const { controller, playerService, registrationService } = createController()
			const user = createUser({ isStaff: true })
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: 42 })
			playerService.movePlayers.mockResolvedValue({ movedCount: 2 })

			const result = await controller.movePlayers(100, moveRequest, req)

			expect(registrationService.findSlotById).toHaveBeenCalledWith(101)
			expect(playerService.movePlayers).toHaveBeenCalledWith(100, moveRequest)
			expect(result).toEqual({ movedCount: 2 })
		})

		it("non-admin ownership failure: throws ForbiddenException", async () => {
			const { controller, registrationService } = createController()
			const user = createUser({ playerId: 5 })
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: 42 })
			registrationService.findRegistrationById.mockRejectedValue(
				new ForbiddenException("Not authorized"),
			)

			await expect(controller.movePlayers(100, moveRequest, req)).rejects.toThrow(
				ForbiddenException,
			)

			expect(registrationService.findSlotById).toHaveBeenCalledWith(101)
			expect(registrationService.findRegistrationById).toHaveBeenCalledWith(42, 5)
		})

		it("non-admin with slot not in registration: throws ForbiddenException", async () => {
			const { controller, registrationService } = createController()
			const user = createUser()
			const req = { user } as any

			registrationService.findSlotById.mockResolvedValue({ registrationId: null })

			await expect(controller.movePlayers(100, moveRequest, req)).rejects.toThrow(
				ForbiddenException,
			)
		})
	})
})
