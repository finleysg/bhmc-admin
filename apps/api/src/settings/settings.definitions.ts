/**
 * Every admin setting: its type, limits, and default. Adding a setting is a code
 * change here; no migration is needed (values live in core_adminsetting).
 */
interface IntegerSetting {
	label: string
	description: string
	type: "integer"
	min: number
	max: number
	unit?: string
	default: number
}

export const SETTING_DEFINITIONS = {
	"readiness.alertLeadDays": {
		label: "Readiness alert lead time",
		description:
			"How many days before an event's signup opens to start emailing Event Admins about readiness findings.",
		type: "integer",
		min: 1,
		max: 60,
		unit: "days",
		default: 7,
	},
} as const satisfies Record<string, IntegerSetting>

export type SettingKey = keyof typeof SETTING_DEFINITIONS

export function isSettingKey(key: string): key is SettingKey {
	return Object.hasOwn(SETTING_DEFINITIONS, key)
}

/** An error message if `value` is not valid for the setting, otherwise null. */
export function validateSetting(key: SettingKey, value: unknown): string | null {
	const def: IntegerSetting = SETTING_DEFINITIONS[key]
	if (typeof value !== "number" || !Number.isInteger(value)) {
		return `${def.label} must be a whole number`
	}
	if (value < def.min || value > def.max) {
		return `${def.label} must be between ${def.min} and ${def.max}`
	}
	return null
}
