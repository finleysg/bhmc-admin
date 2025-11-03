import { Controller, Get, Param, Post, UseInterceptors } from "@nestjs/common"

import { LogIntegrationInterceptor } from "./interceptors/log-integration.interceptor"
import { EventSyncService } from "./services/event-sync.service"
import { IntegrationLogService } from "./services/integration-log.service"
import { MemberSyncService } from "./services/member-sync.service"
import { RosterExportService } from "./services/roster-export.service"
import { ScoresImportService } from "./services/scores-import.service"

@Controller("golfgenius")
export class GolfgeniusController {
	constructor(
		private readonly memberSync: MemberSyncService,
		private readonly eventSync: EventSyncService,
		private readonly scoresImport: ScoresImportService,
		private readonly rosterExport: RosterExportService,
		private readonly integrationLog: IntegrationLogService,
	) {}

	@Post("/roster/sync")
	async syncRoster() {
		return this.memberSync.syncMembersWithMasterRoster()
	}

	@Post("/roster/sync/:id")
	async syncPlayer(@Param("id") id: string) {
		const pid = parseInt(id, 10)
		return this.memberSync.syncPlayer(pid)
	}

	@Post("/events/:id/sync")
	@UseInterceptors(LogIntegrationInterceptor)
	async syncEvent(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.eventSync.syncEvent(eid)
	}

	@Post("/events/:id/export-roster")
	@UseInterceptors(LogIntegrationInterceptor)
	async exportRoster(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.rosterExport.exportEventRoster(eid)
	}

	@Post("/events/:id/import-scores")
	@UseInterceptors(LogIntegrationInterceptor)
	async importEventScores(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.scoresImport.importScoresForEvent(eid)
	}

	@Get("/events/:id/logs")
	async getEventLogs(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.integrationLog.getLogsByEventId(eid)
	}
}
