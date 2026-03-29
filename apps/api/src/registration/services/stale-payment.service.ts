import { Inject, Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import { MailService } from "../../mail"
import { RegistrationRepository } from "../repositories/registration.repository"

@Injectable()
export class StalePaymentService {
	private readonly logger = new Logger(StalePaymentService.name)

	constructor(
		@Inject(RegistrationRepository) private readonly repository: RegistrationRepository,
		@Inject(MailService) private readonly mail: MailService,
		@Inject(ConfigService) private readonly config: ConfigService,
	) {}

	async notifyStalePayments(): Promise<number> {
		const cutoff = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
		const staleRegistrations = await this.repository.findStalePaymentProcessingRegistrations(cutoff)

		if (staleRegistrations.length === 0) return 0

		const adminEmail = this.config.getOrThrow<string>("ADMIN_NOTIFICATION_EMAIL")

		for (const reg of staleRegistrations) {
			const recipients = [...new Set([adminEmail, reg.paymentUserEmail])]

			const eventDate = new Date(reg.eventDate).toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			})

			try {
				await this.mail.sendStalePaymentNotification(recipients, {
					eventName: reg.eventName,
					eventDate,
					registrationDate: new Date(reg.createdDate).toLocaleString("en-US"),
					registrationId: reg.registrationId,
					paymentCode: reg.paymentCode,
				})
			} catch (error) {
				this.logger.error(
					`Failed to send failed payment notification for registration ${reg.registrationId}: ${error instanceof Error ? error.message : "Unknown error"}`,
				)
			}
		}

		await this.repository.resetStaleRegistrations(staleRegistrations.map((r) => r.registrationId))

		return staleRegistrations.length
	}
}
