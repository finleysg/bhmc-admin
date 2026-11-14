/** An admin setting as shown on the Settings page. */
export interface AdminSettingView {
	key: string
	label: string
	description: string
	type: "integer"
	min: number
	max: number
	/** Shown after the value, e.g. "days". */
	unit?: string
	value: number
	defaultValue: number
	/** Null while the setting still uses its default. */
	updatedAt: string | null
	updatedBy: string | null
}
