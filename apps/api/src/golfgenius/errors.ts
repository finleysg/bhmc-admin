export class GolfGeniusError extends Error {
	name = "GolfGeniusError"
	details?: unknown
	constructor(message: string, details?: unknown) {
		super(message)
		this.details = details
	}
}

export class RateLimitError extends GolfGeniusError {
	name = "RateLimitError"
	retryAfter?: number
	constructor(message: string, retryAfter?: number, details?: unknown) {
		super(message, details)
		this.retryAfter = retryAfter
	}
}

export class AuthError extends GolfGeniusError {
	name = "AuthError"
}

export class ApiError extends GolfGeniusError {
	name = "ApiError"
	status?: number
	statusText?: string
	response?: unknown
	constructor(
		message: string,
		status?: number,
		statusText?: string,
		response?: unknown,
		details?: unknown,
	) {
		super(message, details)
		this.status = status
		this.statusText = statusText
		this.response = response
	}
}
