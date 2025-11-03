import { catchError, from, Observable, tap } from "rxjs"

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common"

import { IntegrationActionName } from "../dto/internal.dto"
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
			catchError((error: Error) => {
				// Error case - log the full error including stack trace
				const errorDetails = {
					...error, // Include all error properties first
					message: error.message, // Override with explicit values to ensure they're included
					stack: error.stack,
					name: error.name,
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

				throw error // Re-throw to maintain normal error handling
			}),
		)
	}

	private determineActionName(request: RequestWithParams): IntegrationActionName {
		const url = request.url

		if (url.includes("/events/") && url.includes("/sync")) {
			return "Event Synced"
		} else if (url.includes("/events/") && url.includes("/export-roster")) {
			return "Roster Exported"
		} else if (url.includes("/events/") && url.includes("/import-scores")) {
			return "Scores Imported"
		} else {
			this.logger.warn(`Unknown integration action for URL: ${url}`)
			return "Event Synced" // fallback
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
