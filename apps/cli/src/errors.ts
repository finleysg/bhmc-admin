/** An error to report to the caller as JSON, with the HTTP status when there was one. */
export class CliError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message)
	}
}

/** The error message from an API or Django error response body. */
export async function responseMessage(res: Response): Promise<string> {
	const body = (await res.json().catch(() => null)) as {
		message?: string | string[]
		detail?: string
		non_field_errors?: string[]
	} | null
	const message =
		(Array.isArray(body?.message) ? body.message.join(", ") : body?.message) ??
		body?.detail ??
		body?.non_field_errors?.join(", ")
	return message ?? `Request failed (${res.status})`
}
