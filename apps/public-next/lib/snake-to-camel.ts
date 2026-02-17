/**
 * Recursively converts all snake_case keys in an object (or array of objects)
 * to camelCase. Used to transform Django REST Framework responses into the
 * camelCase format expected by the front-end TypeScript types.
 *
 * Django REST Framework serializes FK fields without an `_id` suffix
 * (e.g. `event_fee` instead of `event_fee_id`). Pass a `fkFields` set to
 * append `Id` to those keys after camelCase conversion.
 */
export function snakeToCamelKeys<T>(data: T, fkFields?: Set<string>): T {
	if (Array.isArray(data)) {
		return data.map((item: unknown) => snakeToCamelKeys(item, fkFields)) as T
	}
	if (data !== null && typeof data === "object" && !(data instanceof Date)) {
		const result: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
			let camelKey = snakeToCamel(key)
			if (fkFields?.has(key) && typeof value !== "object") {
				camelKey += "Id"
			}
			result[camelKey] = snakeToCamelKeys(value, fkFields)
		}
		return result as T
	}
	return data
}

function snakeToCamel(s: string): string {
	return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}
