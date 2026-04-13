/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
/**
 * Justification: This file intentionally inspects untyped error objects from mysql2/drizzle.
 * Those error shapes are external and untyped; accessing fields like `code`, `errno`, `sql`,
 * and `sqlMessage` requires `any`-style access. This is a targeted, auditable exception handler
 * and the use of unsafe accesses is limited to this file.
 */
import type { Response } from "express"

import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Inject,
	Logger,
	Optional,
} from "@nestjs/common"
import { PostHog } from "posthog-node"

import { POSTHOG_CLIENT } from "../posthog"

export function isDuplicateEntryError(error: unknown): boolean {
	const err = error as any
	if (err?.errno === 1062 || err?.code === "ER_DUP_ENTRY") return true
	if (err?.cause?.errno === 1062 || err?.cause?.code === "ER_DUP_ENTRY") return true
	return false
}

@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(DatabaseExceptionFilter.name)

	constructor(@Optional() @Inject(POSTHOG_CLIENT) private readonly posthog?: PostHog | null) {}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()

		// Defaults
		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = "Internal server error"
		const error = exception as any

		// Nest HttpException: preserve original behavior
		if (exception instanceof HttpException) {
			const res = exception.getResponse()
			const st = exception.getStatus()
			response.status(st).json(res)
			return
		}

		// MySQL / mysql2 error shape handling (also covers errors surfaced by Drizzle).
		// Drizzle wraps MySQL errors in DrizzleQueryError where the actual MySQL error
		// lives in .cause — unwrap it so we can detect error codes.
		let dbError = error
		if (error && !error.code && !error.errno && error.cause) {
			const cause = error.cause
			if (cause.code || cause.errno) {
				dbError = cause
			}
		}

		if (dbError && (dbError.code || dbError.errno || dbError.sql)) {
			// Map common MySQL error numbers / codes to HTTP statuses and friendly messages
			if (dbError.errno === 1451 || dbError.code === "ER_ROW_IS_REFERENCED_2") {
				// FK constraint prevents delete/update
				status = HttpStatus.CONFLICT
				message = "Foreign key constraint prevents operation"
			} else if (dbError.errno === 1062 || dbError.code === "ER_DUP_ENTRY") {
				// Duplicate entry
				status = HttpStatus.CONFLICT
				message = "Duplicate entry"
			} else if (dbError.errno === 1452 || dbError.code === "ER_NO_REFERENCED_ROW_2") {
				status = HttpStatus.BAD_REQUEST
				message = "Missing referenced record"
			} else if (dbError.errno === 1205 || dbError.code === "ER_LOCK_WAIT_TIMEOUT") {
				status = HttpStatus.SERVICE_UNAVAILABLE
				message = "The server is busy, please try again in a moment"
			} else {
				// Fallback to original message when available
				message = JSON.stringify(dbError)
				this.posthog?.captureException(
					new Error(
						`Unhandled MySQL error: ${dbError.code ?? dbError.errno ?? "unknown"} – ${dbError.sqlMessage ?? message}`,
					),
					undefined,
					{ app: "api" },
				)
			}

			// Collect details for logging and (in dev) for the response body
			const details: Record<string, unknown> = {
				code: dbError.code ?? null,
				errno: dbError.errno ?? null,
				sqlMessage: dbError.sqlMessage ?? null,
				sql: dbError.sql ?? null,
				params: dbError.parameters ?? dbError?.params ?? null,
			}

			// Log full error for debugging (includes stack)
			this.logger.error({ message, details, stack: error.stack })

			// Respond with a concise message; include details in non-production environments
			const body: any = {
				statusCode: status,
				message,
			}
			if (process.env.NODE_ENV !== "production") {
				body.details = details
			}

			response.status(status).json(body)
			return
		}

		// Unknown error: generic handling
		if (exception instanceof Error) {
			this.logger.error({
				message: exception.message,
				name: exception.name,
				stack: exception.stack,
				cause: exception.cause instanceof Error ? exception.cause.message : exception.cause,
			})
		} else {
			this.logger.error("Unhandled non-Error exception", exception)
		}
		this.posthog?.captureException(
			exception instanceof Error ? exception : new Error(String(exception)),
			undefined,
			{ app: "api" },
		)
		response.status(status).json({ statusCode: status, message })
	}
}
