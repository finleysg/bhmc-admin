import { Controller, Inject, Logger, Param, ParseIntPipe, Req, Res, Sse } from "@nestjs/common"
import { Observable, interval, merge, of } from "rxjs"
import { catchError, map, takeUntil } from "rxjs/operators"
import type { Request, Response } from "express"

import {
	RegistrationBroadcastService,
	RegistrationUpdateEvent,
} from "../services/registration-broadcast.service"

interface SseMessage {
	data: string
	type?: string
	id?: string
}

@Controller("registration")
export class RegistrationLiveController {
	private readonly logger = new Logger(RegistrationLiveController.name)

	constructor(@Inject(RegistrationBroadcastService) private readonly broadcast: RegistrationBroadcastService) {}

	@Sse(":eventId/live")
	liveUpdates(
		@Param("eventId", ParseIntPipe) eventId: number,
		@Req() req: Request,
		@Res() res: Response,
	): Observable<SseMessage> {
		this.logger.log(`SSE connection opened for event ${eventId}`)

		// Set headers for long-lived connection
		res.setHeader("Cache-Control", "no-cache")
		res.setHeader("X-Accel-Buffering", "no") // Disable nginx buffering

		const updates$ = this.broadcast.subscribe(eventId).pipe(
			map(
				(event: RegistrationUpdateEvent): SseMessage => ({
					data: JSON.stringify(event),
					type: "update",
					id: event.timestamp,
				}),
			),
			catchError((error) => {
				this.logger.error(`Error in broadcast stream for event ${eventId}`, error)
				return of({
					data: JSON.stringify({ error: "Stream error occurred" }),
					type: "error",
				} as SseMessage)
			}),
		)

		// Heartbeat every 30 seconds
		const heartbeat$ = interval(30000).pipe(
			map(
				(): SseMessage => ({
					data: "",
					type: "heartbeat",
				}),
			),
		)

		// Handle client disconnect
		const disconnect$ = new Observable<never>((subscriber) => {
			req.on("close", () => {
				this.logger.log(`SSE connection closed for event ${eventId}`)
				subscriber.complete()
			})
			return () => {
				// Cleanup if observable is unsubscribed
			}
		})

		return merge(updates$, heartbeat$).pipe(takeUntil(disconnect$))
	}
}
