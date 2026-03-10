/**
 * Convert an ISO 8601 datetime string (e.g. "2026-03-08T16:00:00.000Z")
 * to the MySQL datetime format ("2026-03-08 16:00:00.000000").
 *
 * MySQL's datetime column does not accept the "T" separator or "Z" suffix.
 * Drizzle with `mode: "string"` passes values through without conversion,
 * so we must format them before writing.
 */
export function toMysqlDatetime(iso: string): string {
	const date = new Date(iso)
	if (isNaN(date.getTime())) {
		throw new Error(`Invalid datetime value: ${iso}`)
	}

	const yyyy = date.getUTCFullYear()
	const MM = String(date.getUTCMonth() + 1).padStart(2, "0")
	const dd = String(date.getUTCDate()).padStart(2, "0")
	const hh = String(date.getUTCHours()).padStart(2, "0")
	const mm = String(date.getUTCMinutes()).padStart(2, "0")
	const ss = String(date.getUTCSeconds()).padStart(2, "0")
	const us = String(date.getUTCMilliseconds()).padStart(3, "0") + "000"

	return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}.${us}`
}
