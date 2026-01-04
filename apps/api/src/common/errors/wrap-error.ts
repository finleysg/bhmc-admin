export function wrapError(error: unknown, context: string): Error {
	const message = error instanceof Error ? error.message : String(error)
	const wrapped = new Error(`${context}: ${message}`)
	if (error instanceof Error) {
		wrapped.cause = error
		wrapped.stack = error.stack
	}
	return wrapped
}
