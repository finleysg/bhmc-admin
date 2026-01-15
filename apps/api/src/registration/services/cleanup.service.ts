import { Inject, Injectable, Logger } from "@nestjs/common"
import { RegistrationStatusChoices } from "@repo/domain/types"
import { RegistrationRepository } from "../repositories/registration.repository"
import { PaymentsRepository } from "../repositories/payments.repository"
import { EventsService } from "../../events"
import { RegistrationBroadcastService } from "./registration-broadcast.service"

@Injectable()
export class CleanupService {
	private readonly logger = new Logger(CleanupService.name)

	constructor(
		@Inject(RegistrationRepository) private readonly repository: RegistrationRepository,
		@Inject(PaymentsRepository) private readonly paymentsRepository: PaymentsRepository,
		@Inject(EventsService) private readonly events: EventsService,
		@Inject(RegistrationBroadcastService) private readonly broadcast: RegistrationBroadcastService,
	) {}

	/**
	 * Clean up expired pending registrations.
	 * Called by cron job.
	 */
	async cleanUpExpired(): Promise<number> {
		const now = new Date()
		const expired = await this.repository.findExpiredPendingRegistrations(now)

		if (expired.length === 0) return 0

		this.logger.log(`Cleaning up ${expired.length} expired registrations`)

		for (const reg of expired) {
			// Delete related payment data
			const payments = await this.paymentsRepository.findPaymentsForRegistration(reg.id)
			this.logger.log(`Found ${payments.length} payments to delete.`)
			for (const payment of payments) {
				this.logger.log(`Deleting fees and payment for id ${payment.id}`)
				await this.paymentsRepository.deletePaymentDetailsByPayment(payment.id)
				await this.paymentsRepository.deletePayment(payment.id)
			}

			const canChoose = await this.events.isCanChooseHolesEvent(reg.eventId)
			const slotIds = reg.slots.map((s) => s.id)
			await this.releaseSlots(slotIds, canChoose)
			await this.repository.deleteRegistration(reg.id)

			if (canChoose) {
				this.broadcast.notifyChange(reg.eventId)
			}
		}

		return expired.length
	}

	/**
	 * Release slots based on event type.
	 * For choosable events: reset slots to AVAILABLE.
	 * For non-choosable events: delete slots.
	 */
	async releaseSlots(slotIds: number[], canChoose: boolean): Promise<void> {
		if (slotIds.length === 0) return

		if (canChoose) {
			await this.repository.updateRegistrationSlots(slotIds, {
				status: RegistrationStatusChoices.AVAILABLE,
				registrationId: null,
				playerId: null,
			})
		} else {
			await this.repository.deleteRegistrationSlots(slotIds)
		}
	}

	/**
	 * Release slots by registration ID.
	 * For choosable events: reset slots to AVAILABLE.
	 * For non-choosable events: delete slots.
	 */
	async releaseSlotsByRegistration(registrationId: number, canChoose: boolean): Promise<void> {
		if (canChoose) {
			const slots = await this.repository.findRegistrationSlotsByRegistrationId(registrationId)
			const slotIds = slots.map((s) => s.id)
			await this.releaseSlots(slotIds, canChoose)
		} else {
			await this.repository.deleteRegistrationSlotsByRegistration(registrationId)
		}
	}
}
