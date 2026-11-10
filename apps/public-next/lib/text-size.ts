export const TEXT_SIZE_KEY = "bhmc-text-size"
export const TEXT_SIZES = ["standard", "larger", "largest"] as const
export type TextSize = (typeof TEXT_SIZES)[number]

export function parseTextSize(value: unknown): TextSize {
	return TEXT_SIZES.find((size) => size === value) ?? "standard"
}

// Generate the early script from the same values used by the interactive control.
export const TEXT_SIZE_SCRIPT = `try {
  const value = localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)});
  document.documentElement.dataset.textSize = ${JSON.stringify(TEXT_SIZES)}.includes(value) ? value : 'standard';
} catch (e) {}`

export function applyTextSize(value: TextSize) {
	document.documentElement.dataset.textSize = value
	try {
		localStorage.setItem(TEXT_SIZE_KEY, value)
	} catch {
		// The preference still works for this visit when storage is unavailable.
	}
}
