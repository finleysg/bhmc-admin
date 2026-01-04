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
	Logger,
} from "@nestjs/common"

@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(DatabaseExceptionFilter.name)

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

		// MySQL / mysql2 error shape handling (also covers errors surfaced by Drizzle)
		if (error && (error.code || error.errno || error.sql)) {
			// Map common MySQL error numbers / codes to HTTP statuses and friendly messages
			if (error.errno === 1451 || error.code === "ER_ROW_IS_REFERENCED_2") {
				// FK constraint prevents delete/update
				status = HttpStatus.CONFLICT
				message = "Foreign key constraint prevents operation"
			} else if (error.errno === 1062 || error.code === "ER_DUP_ENTRY") {
				// Duplicate entry
				status = HttpStatus.CONFLICT
				message = "Duplicate entry"
			} else if (error.errno === 1452 || error.code === "ER_NO_REFERENCED_ROW_2") {
				status = HttpStatus.BAD_REQUEST
				message = "Missing referenced record"
			} else {
				// Fallback to original message when available
				message = JSON.stringify(error)
			}

			// Collect details for logging and (in dev) for the response body
			const details: Record<string, unknown> = {
				code: error.code ?? null,
				errno: error.errno ?? null,
				sqlMessage: error.sqlMessage ?? null,
				sql: error.sql ?? null,
				params: error.parameters ?? error?.params ?? null,
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
		response.status(status).json({ statusCode: status, message })
	}
}
