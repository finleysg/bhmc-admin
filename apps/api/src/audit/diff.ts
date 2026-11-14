import type { AuditChanges } from "./audit.types"

/**
 * The fields of `after` whose values differ from `before`. Values are compared
 * structurally, so arrays and objects with equal contents are unchanged.
 * A field missing from `before` is recorded with a `before` of null.
 */
export function diffChanges(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
): AuditChanges {
	const changes: AuditChanges = {}
	for (const [field, next] of Object.entries(after)) {
		if (next === undefined) continue
		const previous = before[field] ?? null
		if (JSON.stringify(previous) !== JSON.stringify(next)) {
			changes[field] = { before: previous, after: next }
		}
	}
	return changes
}
