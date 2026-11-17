import { Inject, Injectable } from "@nestjs/common"
import { registrationOpensAt } from "@repo/domain/functions"

import type { AlertFinding, AlertSource } from "../alerts/alerts.types"
import { SettingsService } from "../settings"

import { ReadinessService } from "./readiness.service"

const DAY_MS = 86_400_000

/**
 * Tells Event Admins about events whose registration opens within the lead time
 * and that still have blocking findings or warnings not dismissed.
 */
@Injectable()
export class ReadinessAlertSource implements AlertSource {
	readonly name = "Ready to Open Registration"

	constructor(
		@Inject(ReadinessService) private readonly readiness: ReadinessService,
		@Inject(SettingsService) private readonly settings: SettingsService,
	) {}

	async findings(today: Date): Promise<AlertFinding[]> {
		const leadDays = await this.settings.get("readiness.alertLeadDays")
		const horizon = today.getTime() + leadDays * DAY_MS
		// Registration can open in January for a season whose events start later.
		const seasons = [today.getFullYear(), today.getFullYear() + 1]
		const events = (
			await Promise.all(seasons.map((s) => this.readiness.forSeasonWithEvents(s, today)))
		).flat()

		return events
			.filter(({ event, readiness }) => {
				const opens = registrationOpensAt(event)
				return readiness.level !== "green" && opens != null && Date.parse(opens) <= horizon
			})
			.flatMap(({ event, readiness }) =>
				readiness.findings
					.filter((f) => !f.dismissed)
					.map((f) => ({
						source: this.name,
						title: `${event.name} (${event.startDate}): ${f.what}`,
						detail: `${f.why} ${f.fix}`,
						recipients: [{ role: "event-admin" as const }],
					})),
			)
	}
}
