import {
	Body,
	Controller,
	Get,
	Logger,
	NotFoundException,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Put,
	Req,
} from "@nestjs/common"

import { RegistrationWithSlots } from "@repo/domain/types"

import type {
	AddPlayersRequest,
	CancelRegistrationRequest,
	ReserveRequest,
	UpdateNotesRequest,
	UpdateSlotPlayerRequest,
} from "@repo/domain/types"
import { UserRegistrationService } from "../services/user-registration.service"
import type { AuthenticatedRequest } from "../../auth"

@Controller("registration")
export class UserRegistrationController {
	private readonly logger = new Logger(UserRegistrationController.name)

	constructor(private readonly flowService: UserRegistrationService) {}

	/**
	 * Create a registration and reserve slots.
	 * POST /registration
	 */
	@Post()
	async createRegistration(
		@Req() req: AuthenticatedRequest,
		@Body() dto: ReserveRequest,
	): Promise<RegistrationWithSlots> {
		const user = req.user

		this.logger.log(`Creating registration for user ${user.id} event ${dto.eventId}`)

		return this.flowService.createAndReserve(user, dto)
	}

	/**
	 * Get a registration by ID.
	 * GET /registration/:id
	 */
	@Get(":id")
	async getRegistration(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) registrationId: number,
	): Promise<RegistrationWithSlots> {
		const registration = await this.flowService.findRegistrationById(registrationId, req.user.id)
		if (!registration) {
			throw new NotFoundException(`Registration ${registrationId} not found`)
		}

		return registration
	}

	/**
	 * Cancel a registration and release slots.
	 * PUT /registration/:id/cancel
	 */
	@Put(":id/cancel")
	async cancelRegistration(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) registrationId: number,
		@Body() dto: CancelRegistrationRequest,
	): Promise<{ success: boolean }> {
		this.logger.log(`Canceling registration ${registrationId}: ${dto.reason}`)
		await this.flowService.cancelRegistration(registrationId, req.user.id, dto.paymentId ?? null)

		return { success: true }
	}

	/**
	 * Update registration notes.
	 * PATCH /registration/:id
	 */
	@Patch(":id")
	async updateNotes(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) registrationId: number,
		@Body() dto: UpdateNotesRequest,
	): Promise<{ success: boolean }> {
		await this.flowService.updateNotes(registrationId, req.user.id, dto.notes)
		return { success: true }
	}

	/**
	 * Update a slot's player assignment.
	 * PATCH /registration/slots/:id
	 */
	@Patch("slots/:id")
	async updateSlot(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) slotId: number,
		@Body() dto: UpdateSlotPlayerRequest,
	): Promise<{ success: boolean }> {
		const slot = await this.flowService.findSlotById(slotId)
		if (!slot.registrationId) {
			throw new NotFoundException(`Slot ${slotId} not associated with a registration`)
		}

		const reg = await this.flowService.findRegistrationById(slot.registrationId, req.user.id)
		if (!reg) {
			throw new NotFoundException(`Registration not found`)
		}

		this.logger.debug(`Updating slot ${slotId} player to ${dto.playerId}`)
		await this.flowService.updateSlotPlayer(slotId, dto.playerId)

		return { success: true }
	}

	/**
	 * Add players to a registration group.
	 * PUT /registration/:id/add_players
	 */
	@Put(":id/add-players")
	async addPlayers(
		@Req() req: AuthenticatedRequest,
		@Param("id", ParseIntPipe) registrationId: number,
		@Body() dto: AddPlayersRequest,
	): Promise<RegistrationWithSlots> {
		const playerIds = dto.players.map((p) => p.id)
		this.logger.log(`Adding ${playerIds.length} players to registration ${registrationId}`)

		return this.flowService.addPlayersToRegistration(registrationId, playerIds, req.user.id)
	}
}
