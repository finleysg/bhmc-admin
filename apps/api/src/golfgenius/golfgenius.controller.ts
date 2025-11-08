import { Observable } from "rxjs"
import { map } from "rxjs/operators"

import { Controller, Get, Logger, Param, Post, Query, Sse, UseInterceptors } from "@nestjs/common"
import { IntegrationActionName } from "@repo/dto"

import { LogIntegrationInterceptor } from "./interceptors/log-integration.interceptor"
import { EventSyncService } from "./services/event-sync.service"
import { IntegrationLogService } from "./services/integration-log.service"
import { MemberSyncService } from "./services/member-sync.service"
import { ResultsImportService } from "./services/results-import.service"
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
		private readonly resultsImport: ResultsImportService,
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

	@Post("/events/:id/sync-event")
	@UseInterceptors(LogIntegrationInterceptor)
	async syncEvent(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.eventSync.syncEvent(eid)
	}

	@Post("/events/:id/import-scores")
	@UseInterceptors(LogIntegrationInterceptor)
	async importEventScores(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.scoresImport.importScoresForEvent(eid)
	}

	@Post("/events/:id/import-points")
	@UseInterceptors(LogIntegrationInterceptor)
	async importPointsResults(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.resultsImport.importPointsResults(eid)
	}

	@Post("/events/:id/import-skins")
	@UseInterceptors(LogIntegrationInterceptor)
	async importSkinsResults(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.resultsImport.importSkinsResults(eid)
	}

	@Post("/events/:id/import-proxies")
	@UseInterceptors(LogIntegrationInterceptor)
	async importProxyResults(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.resultsImport.importProxyResults(eid)
	}

	@Post("/events/:id/import-results")
	@UseInterceptors(LogIntegrationInterceptor)
	async importStrokePlayResults(@Param("id") id: string) {
		const eid = parseInt(id, 10)
		return this.resultsImport.importStrokePlayResults(eid)
	}

	@Get("/events/:id/logs")
	async getEventLogs(@Param("id") id: string, @Query("actionName") actionName?: string) {
		const eid = parseInt(id, 10)
		return this.integrationLog.getLogsByEventId(eid, actionName as IntegrationActionName)
	}

	@Sse("/events/:id/export-roster")
	// @UseInterceptors(LogIntegrationInterceptor)
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

	@Sse("/events/:id/import-scores-stream")
	// @UseInterceptors(LogIntegrationInterceptor)
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

	@Sse("/events/:id/import-points-stream")
	// @UseInterceptors(LogIntegrationInterceptor)
	async importPointsStream(@Param("id") id: string): Promise<Observable<{ data: string }>> {
		const eid = parseInt(id, 10)

		// Check if import is already running
		const existingSubject = this.resultsImport.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new import and return progress stream
		try {
			const subject = await this.resultsImport.importPointsResultsStream(eid)

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

	@Sse("/events/:id/import-skins-stream")
	// @UseInterceptors(LogIntegrationInterceptor)
	async importSkinsStream(@Param("id") id: string): Promise<Observable<{ data: string }>> {
		const eid = parseInt(id, 10)

		// Check if import is already running
		const existingSubject = this.resultsImport.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new import and return progress stream
		try {
			const subject = await this.resultsImport.importSkinsResultsStream(eid)

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

	@Sse("/events/:id/import-proxies-stream")
	// @UseInterceptors(LogIntegrationInterceptor)
	async importProxiesStream(@Param("id") id: string): Promise<Observable<{ data: string }>> {
		const eid = parseInt(id, 10)

		// Check if import is already running
		const existingSubject = this.resultsImport.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new import and return progress stream
		try {
			const subject = await this.resultsImport.importProxyResultsStream(eid)

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

	@Sse("/events/:id/import-results-stream")
	// @UseInterceptors(LogIntegrationInterceptor)
	async importResultsStream(@Param("id") id: string): Promise<Observable<{ data: string }>> {
		const eid = parseInt(id, 10)

		// Check if import is already running
		const existingSubject = this.resultsImport.getProgressObservable(eid)
		if (existingSubject) {
			return existingSubject.pipe(
				map((progress) => ({
					data: JSON.stringify(progress),
				})),
			)
		}

		// Start new import and return progress stream
		try {
			const subject = await this.resultsImport.importStrokePlayResultsStream(eid)

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
