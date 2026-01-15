// compile this once
const nonHexChars = /[^#a-f\d]/gi

// Convert a hex color to an RGB object. Shorthand hex (#fff) or expanded hex (#ffffff) are supported.
function hexRgb(hex: string) {
	// sanitise our inputs
	if (
		!hex ||
		!(hex.length === 4 || hex.length === 7) || // Cheap check for length
		hex[0] !== "#" || // Cheap check for correct first char
		nonHexChars.test(hex) // More expensive check for any non hex chars
	) {
		throw new Error("Expected a valid hex string")
	}

	// remove the # from the start of the string
	hex = hex.substring(1)

	// if we have a shorthand hex then expand it
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
	}

	// convert into our rbg values
	const num = parseInt(hex, 16)
	const red = num >> 16
	const green = (num >> 8) & 255
	const blue = num & 255

	return { red, green, blue }
}

// Convert a hex and alpha into an rgba string directly usable in CSS.
export function rgba(color: string, alpha: number) {
	if (!color) {
		throw new Error(`Invalid color '${color}'. Color should be a valid hexadecimal value '#FFFFFF'`)
	}

	// 2. make sure our opacity is in a sensible range 0 to 1
	if (alpha < 0 || alpha > 1) {
		throw new Error(`Invalid opacity '${alpha}'. Opacity should be in the range 0 to 1`)
	}

	// 3. convert our hex value to rgb
	try {
		const rgb = hexRgb(color)
		return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`
	} catch (e) {
		throw new Error(
			`Invalid color '${color}'. Color should be a valid hexadecimal value, for example '#FFFFFF'`,
		)
	}
}
