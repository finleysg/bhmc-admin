import { Controller, Get, Inject } from "@nestjs/common"

import { Roles } from "../auth"

import { AlertsService } from "./alerts.service"
import type { AlertDigest } from "./alerts.types"

@Controller("alerts")
@Roles("event-admin", "club-admin")
export class AlertsController {
	constructor(@Inject(AlertsService) private readonly alerts: AlertsService) {}

	/** What today's 7am alert run would send, without sending anything. */
	@Get("preview")
	async preview(): Promise<AlertDigest[]> {
		return this.alerts.plan(new Date())
	}
}
