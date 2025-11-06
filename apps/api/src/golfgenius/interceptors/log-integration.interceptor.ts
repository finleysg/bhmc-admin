import { catchError, from, Observable, tap } from "rxjs"

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common"
import { IntegrationActionName } from "@repo/dto"

import { IntegrationLogService } from "../services/integration-log.service"

interface RequestWithParams {
	url: string
	params: Record<string, string>
}

@Injectable()
export class LogIntegrationInterceptor implements NestInterceptor {
	private readonly logger = new Logger(LogIntegrationInterceptor.name)

	constructor(private readonly integrationLogService: IntegrationLogService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<RequestWithParams>()
		const actionName = this.determineActionName(request)
		const eventId = this.extractEventId(request)

		return next.handle().pipe(
			tap((result) => {
				// Success case - log the result
				from(
					this.integrationLogService.createLogEntry({
						actionName,
						actionDate: new Date().toISOString(),
						details: JSON.stringify(result, null, 2),
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
		} else if (url.includes("/events/") && url.includes("/import-scores")) {
			return "Import Points"
		} else if (url.includes("/events/") && url.includes("/import-points")) {
			return "Import Results"
		} else if (url.includes("/events/") && url.includes("/import-results")) {
			return "Import Skins"
		} else if (url.includes("/events/") && url.includes("/import-skins")) {
			return "Import Proxies"
		} else {
			this.logger.warn(`Unknown integration action for URL: ${url}`)
			return "Close Event" // fallback
		}
	}

	private extractEventId(request: RequestWithParams): number {
		const params = request.params
		if (params && params.id) {
			const eventId = parseInt(params.id, 10)
			if (!isNaN(eventId)) {
				return eventId
			}
		}
		this.logger.warn(`Could not extract event ID from request params: ${JSON.stringify(params)}`)
		return 0 // fallback
	}
}
