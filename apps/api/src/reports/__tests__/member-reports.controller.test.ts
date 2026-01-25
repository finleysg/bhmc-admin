import type { Response } from "express"

import type { AuthenticatedRequest } from "../../auth"
import { MemberReportsController } from "../member-reports.controller"
import type { MemberScoresService } from "../member-scores.service"

// =============================================================================
// Mock Setup
// =============================================================================

const createMockMemberScoresService = () => ({
	getPlayerScoresExcel: jest.fn(),
})

const createMockRequest = (playerId: number): AuthenticatedRequest =>
	({
		user: {
			id: 1,
			playerId,
			email: "test@example.com",
			firstName: "Test",
			lastName: "User",
			isStaff: false,
			isActive: true,
			isSuperuser: false,
			ghin: null,
			birthDate: null,
		},
	}) as unknown as AuthenticatedRequest

const createMockResponse = () => {
	const setHeader = jest.fn().mockReturnThis()
	const send = jest.fn().mockReturnThis()
	const res: Partial<Response> = { setHeader, send }
	return { res: res as Response, setHeader, send }
}

function createController() {
	const service = createMockMemberScoresService()
	const controller = new MemberReportsController(service as unknown as MemberScoresService)
	return { controller, service }
}

// =============================================================================
// Tests
// =============================================================================

describe("MemberReportsController", () => {
	describe("GET /reports/member/scores/:season/export", () => {
		test("returns Excel with correct Content-Type header", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res, setHeader } = createMockResponse()
			const buffer = Buffer.from("test excel content")

			service.getPlayerScoresExcel.mockResolvedValue(buffer)

			await controller.getScoresExport(req, 2024, undefined, undefined, res)

			expect(setHeader).toHaveBeenCalledWith(
				"Content-Type",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			)
		})

		test("returns Excel with correct Content-Disposition header", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res, setHeader } = createMockResponse()
			const buffer = Buffer.from("test excel content")

			service.getPlayerScoresExcel.mockResolvedValue(buffer)

			await controller.getScoresExport(req, 2024, undefined, undefined, res)

			expect(setHeader).toHaveBeenCalledWith(
				"Content-Disposition",
				'attachment; filename="my-scores-2024.xlsx"',
			)
		})

		test("sends buffer in response", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res, send } = createMockResponse()
			const buffer = Buffer.from("test excel content")

			service.getPlayerScoresExcel.mockResolvedValue(buffer)

			await controller.getScoresExport(req, 2024, undefined, undefined, res)

			expect(send).toHaveBeenCalledWith(buffer)
		})

		test("uses playerId from authenticated user", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(99)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2024, undefined, undefined, res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(99, 2024, undefined, "both")
		})

		test("passes season param to service", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2025, undefined, undefined, res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(42, 2025, undefined, "both")
		})

		test("includes season in filename", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res, setHeader } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2023, undefined, undefined, res)

			expect(setHeader).toHaveBeenCalledWith(
				"Content-Disposition",
				'attachment; filename="my-scores-2023.xlsx"',
			)
		})
	})

	describe("query param handling", () => {
		test("parses courseIds from comma-separated string", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2024, "1,2,3", undefined, res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(42, 2024, [1, 2, 3], "both")
		})

		test("passes undefined courseIds when param not provided", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2024, undefined, undefined, res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(42, 2024, undefined, "both")
		})

		test("passes scoreType param to service", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2024, undefined, "gross", res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(42, 2024, undefined, "gross")
		})

		test("defaults scoreType to 'both' when not provided", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2024, undefined, undefined, res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(42, 2024, undefined, "both")
		})

		test("accepts scoreType=net", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2024, undefined, "net", res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(42, 2024, undefined, "net")
		})

		test("handles single courseId", async () => {
			const { controller, service } = createController()
			const req = createMockRequest(42)
			const { res } = createMockResponse()

			service.getPlayerScoresExcel.mockResolvedValue(Buffer.from(""))

			await controller.getScoresExport(req, 2024, "5", undefined, res)

			expect(service.getPlayerScoresExcel).toHaveBeenCalledWith(42, 2024, [5], "both")
		})
	})
})
