import { Body, Controller, Get, Inject, Param, Put } from "@nestjs/common"
import type { AdminSettingView } from "@repo/domain/types"

import { Audit, type AuditContext } from "../audit"
import { ClubAdmin } from "../auth"

import { SettingsService } from "./settings.service"

/** Operational settings, edited on the admin Settings page (Club Admin). */
@Controller("settings")
@ClubAdmin()
export class SettingsController {
	constructor(@Inject(SettingsService) private readonly service: SettingsService) {}

	@Get()
	async list(): Promise<AdminSettingView[]> {
		return this.service.list()
	}

	@Put(":key")
	async update(
		@Param("key") key: string,
		@Body() body: { value?: unknown },
		@Audit() audit: AuditContext,
	): Promise<AdminSettingView> {
		return this.service.update(key, body?.value, audit)
	}
}
