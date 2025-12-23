import { catchError, from, Observable, tap } from "rxjs"

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common"
import { IntegrationActionName } from "@repo/domain/types"

import { IntegrationLogRepository } from "../integration-log.repository"
import { RosterExportService } from "../services/roster-export.service"

interface RequestWithParams {
	url: string
	params: Record<string, string>
}

@Injectable()
export class LogIntegrationInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LogIntegrationInterceptor.name)

	constructor(
		private readonly integrationLogService: IntegrationLogRepository,
		private readonly rosterExportService: RosterExportService,
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<RequestWithParams>()
		const actionName = this.determineActionName(request)
		const eventId = this.extractEventId(request)

		return next.handle().pipe(
			tap((result) => {
				// Success case - log the result
				let logResult: unknown = result

				// For export roster, get the actual export result instead of SSE progress data
				if (actionName === "Export Roster") {
					const exportResult = this.rosterExportService.getExportResult(eventId)
					if (exportResult) {
						logResult = exportResult
					}
				}

				from(
					this.integrationLogService.createLogEntry({
						actionName,
						actionDate: new Date().toISOString(),
						details: JSON.stringify(logResult, null, 2),
						eventId,
						isSuccessful: true,
					}),
				).subscribe()
			}),
			catchError((error: unknown) => {
				// Error case - log the full error including stack trace
				const errorDetails = {
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					name: error instanceof Error ? error.name : "UnknownError",
				}

				from(
					this.integrationLogService.createLogEntry({
						actionName,
						actionDate: new Date().toISOString(),
						details: JSON.stringify(errorDetails, null, 2),
						eventId,
						isSuccessful: false,
					}),
				).subscribe()

				throw error as Error // Re-throw to maintain normal error handling
			}),
		)
	}

	private determineActionName(request: RequestWithParams): IntegrationActionName {
		const url = request.url

		if (url.includes("/events/") && url.includes("/sync-event")) {
			return "Sync Event"
		} else if (url.includes("/events/") && url.includes("/export-roster")) {
			return "Export Roster"
		} else if (url.includes("/events/") && url.includes("/import-scores")) {
			return "Import Scores"
		} else if (url.includes("/events/") && url.includes("/import-points")) {
			return "Import Points"
		} else if (url.includes("/events/") && url.includes("/import-results")) {
			return "Import Results"
		} else if (url.includes("/events/") && url.includes("/import-low-scores")) {
			return "Import Low Scores"
		} else if (url.includes("/events/") && url.includes("/import-champions")) {
			return "Import Champions"
		} else if (url.includes("/events/") && url.includes("/close")) {
			return "Close Event"
		} else {
			this.logger.warn(`Unknown integration action for URL: ${url}`)
			return "Close Event" // fallback
		}
	}

	private extractEventId(request: RequestWithParams): number {
		const params = request.params
		// Check for both 'id' and 'eventId' parameter names
		const paramValue = params?.id || params?.eventId
		if (paramValue) {
			const eventId = parseInt(paramValue, 10)
			if (!isNaN(eventId)) {
				return eventId
			}
		}
		this.logger.warn(`Could not extract event ID from request params: ${JSON.stringify(params)}`)
		return 0 // fallback
	}
}
