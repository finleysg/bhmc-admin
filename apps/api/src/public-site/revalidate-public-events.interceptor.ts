import {
	type CallHandler,
	type ExecutionContext,
	Inject,
	Injectable,
	type NestInterceptor,
} from "@nestjs/common"
import type { Request } from "express"
import { type Observable, tap } from "rxjs"

import { PublicSiteService } from "./public-site.service"

/** Every public page that shows events caches them under this tag. */
export const EVENTS_TAG = "events"

/** The public event page caches its open spots under this tag. */
export const eventSlotsTag = (eventId: number | string) => `event-slots-${eventId}`

/**
 * After a successful change to an event (any method but GET), clears the public site's
 * cached events, and the event's slots when the route names the event.
 */
@Injectable()
export class RevalidatePublicEventsInterceptor implements NestInterceptor {
	constructor(@Inject(PublicSiteService) private readonly publicSite: PublicSiteService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>()
		if (request.method === "GET") return next.handle()
		return next.handle().pipe(
			tap(() => {
				const eventId = request.params?.eventId as string | undefined
				const tags = eventId ? [EVENTS_TAG, eventSlotsTag(eventId)] : [EVENTS_TAG]
				void this.publicSite.revalidate(tags)
			}),
		)
	}
}
