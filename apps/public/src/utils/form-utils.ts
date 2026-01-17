import { ZodError } from "zod"

export function formatZodErrors(error: ZodError): Record<string, string> {
	return Object.fromEntries(error.errors.map((e) => [e.path.join("."), e.message]))
}
