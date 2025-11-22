import { Observable } from "rxjs"
import { map } from "rxjs/operators"

import {
	Controller,
	Get,
	Logger,
	Param,
	ParseIntPipe,
	Post,
	Query,
	Sse,
	UseInterceptors,
} from "@nestjs/common"
import { IntegrationActionName } from "@repo/domain/types"

import { EventsService } from "../events/events.service"
import { LogIntegrationInterceptor } from "./interceptors/log-integration.interceptor"
import { EventSyncService } from "./services/event-sync.service"
import { ImportAllResultsService } from "./services/import-all-results.service"
import { IntegrationLogService } from "./services/integration-log.service"
import { LowScoresImportService } from "./services/low-scores-import.service"
import { MemberSyncService } from "./services/member-sync.service"
import { PointsImportService } from "./services/points-import.service"
import { RosterExportService } from "./services/roster-export.service"
import { ScoresImportService } from "./services/scores-import.service"

@Controller("golfgenius")
export class GolfgeniusController {
	private readonly logger = new Logger(GolfgeniusController.name)

	constructor(
		private readonly memberSync: MemberSyncService,
		private readonly eventSync: EventSyncService,
		private readonly scoresImport: ScoresImportService,
		private readonly rosterExport: RosterExportService,
		private readonly pointsImport: PointsImportService,
		private readonly importAllResults: ImportAllResultsService,
		private readonly lowScoresImport: LowScoresImportService,
		private readonly integrationLog: IntegrationLogService,
		private readonly events: EventsService,
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

	@Post("/events/:id/sync-event")
	@UseInterceptors(LogIntegrationInterceptor)
	async syncEvent(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.eventSync.syncEvent(eid)
	}

	@Post("events/:eventId/close-event")
	@UseInterceptors(LogIntegrationInterceptor)
	async closeEvent(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.events.closeEvent(eventId)
	}

	@Post("events/:eventId/import-low-scores")
	@UseInterceptors(LogIntegrationInterceptor)
	async importLowScores(@Param("eventId", ParseIntPipe) eventId: number) {
		return this.lowScoresImport.importLowScores(eventId)
	}

	@Get("/events/:id/logs")
	async getEventLogs(@Param("id") id: string, @Query("actionName") actionName?: string) {
		const eid = parseInt(id, 10)
		return this.integrationLog.getLogsByEventId(eid, actionName as IntegrationActionName)
	}

	@Sse("/events/:id/export-roster")
	exportRoster(@Param("id") id: string): Observable<{ data: string }> {
		const eid = parseInt(id, 10)

		// Check if export is already running
		const existingSubject = this.rosterExport.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new export and return progress stream
		try {
			const subject = this.rosterExport.exportEventRoster(eid)

			return subject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		} catch (error) {
			return new Observable<{ data: string }>((subscriber) => {
				subscriber.error(error)
			})
		}
	}

	@Sse("/events/:id/import-scores")
	async importScoresStream(@Param("id") id: string): Promise<Observable<{ data: string }>> {
		const eid = parseInt(id, 10)

		// Check if import is already running
		const existingSubject = this.scoresImport.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new import and return progress stream
		try {
			const subject = await this.scoresImport.importScoresForEventStream(eid)

			return subject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		} catch (error) {
			return new Observable<{ data: string }>((subscriber) => {
				subscriber.error(error)
			})
		}
	}

	@Sse("/events/:id/import-points")
	async importPointsStream(@Param("id") id: string): Promise<Observable<{ data: string }>> {
		const eid = parseInt(id, 10)

		// Check if import is already running
		const existingSubject = this.pointsImport.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new import and return progress stream
		try {
			const subject = await this.pointsImport.importPointsResultsStream(eid)

			return subject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		} catch (error) {
			return new Observable<{ data: string }>((subscriber) => {
				subscriber.error(error)
			})
		}
	}

	@Sse("/events/:id/import-results")
	async importAllResultsStream(@Param("id") id: string): Promise<Observable<{ data: string }>> {
		const eid = parseInt(id, 10)

		// Check if import is already running
		const existingSubject = this.importAllResults.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new import and return progress stream
		try {
			const subject = await this.importAllResults.importAllResultsStream(eid)

			return subject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		} catch (error) {
			return new Observable<{ data: string }>((subscriber) => {
				subscriber.error(error)
			})
		}
	}
}
