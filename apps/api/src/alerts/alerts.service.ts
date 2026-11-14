import { Inject, Injectable, Logger } from "@nestjs/common"
import { ADMIN_ROLE_GROUPS } from "@repo/domain/types"

import { MailService } from "../mail/mail.service"

import { AlertDigestEmail } from "./alert-digest-email"
import { AlertRecipientsRepository } from "./alert-recipients.repository"
import {
	ALERT_SOURCES,
	type AlertDigest,
	type AlertRecipient,
	type AlertSource,
} from "./alerts.types"

/** Alerts go out at 7am Central; dates in the email are the club's. */
export const ALERT_TIME_ZONE = "America/Chicago"

@Injectable()
export class AlertsService {
	private readonly logger = new Logger(AlertsService.name)

	constructor(
		@Inject(ALERT_SOURCES) private readonly sources: AlertSource[],
		@Inject(AlertRecipientsRepository) private readonly recipients: AlertRecipientsRepository,
		@Inject(MailService) private readonly mail: MailService,
	) {}

	/** What today's run would send: one digest per recipient, each listing their findings. */
	async plan(today: Date): Promise<AlertDigest[]> {
		const byEmail = new Map<string, AlertDigest>()
		const roleEmails = new Map<string, Promise<string[]>>()
		const emailsFor = (recipient: AlertRecipient): Promise<string[]> => {
			if ("email" in recipient) return Promise.resolve([recipient.email])
			const group = ADMIN_ROLE_GROUPS[recipient.role]
			if (!roleEmails.has(group)) roleEmails.set(group, this.recipients.emailsInGroup(group))
			return roleEmails.get(group)!
		}

		for (const source of this.sources) {
			for (const { recipients, ...finding } of await source.findings(today)) {
				const emails = (await Promise.all(recipients.map(emailsFor))).flat()
				// One copy per person, however many ways they're addressed.
				for (const email of new Set(emails.map((e) => e.trim().toLowerCase()))) {
					const digest = byEmail.get(email) ?? { email, findings: [] }
					digest.findings.push(finding)
					byEmail.set(email, digest)
				}
			}
		}
		return [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email))
	}

	/**
	 * Sends today's digests. Nothing is sent when there are no findings. A failed
	 * send is logged and the rest still go out.
	 */
	async run(today: Date): Promise<{ sent: number; failed: number }> {
		const digests = await this.plan(today)
		const date = today.toLocaleDateString("en-US", {
			timeZone: ALERT_TIME_ZONE,
			dateStyle: "medium",
		})
		let sent = 0
		let failed = 0
		for (const digest of digests) {
			try {
				await this.mail.sendEmail({
					to: digest.email,
					subject: `BHMC admin alerts: ${digest.findings.length} item${digest.findings.length === 1 ? "" : "s"}`,
					template: AlertDigestEmail({ date, findings: digest.findings }),
				})
				sent++
			} catch (error) {
				failed++
				this.logger.error(`Alert digest to ${digest.email} failed`, error)
			}
		}
		return { sent, failed }
	}
}
