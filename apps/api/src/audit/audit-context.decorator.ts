import { createParamDecorator, ExecutionContext } from "@nestjs/common"

import type { AuthenticatedRequest } from "../auth"

import type { AuditContext } from "./audit.types"

/** The CLI identifies itself with this header; anything else is the admin UI. */
export const ADMIN_CLIENT_HEADER = "x-admin-client"

/** Injects the AuditContext (actor and client) for the current request. */
export const Audit = createParamDecorator((_: unknown, ctx: ExecutionContext): AuditContext => {
	const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
	return {
		actorId: req.user.id,
		client: req.headers[ADMIN_CLIENT_HEADER] === "cli" ? "cli" : "ui",
	}
})
