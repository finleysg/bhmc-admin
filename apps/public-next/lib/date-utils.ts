import { format, isDate, isValid } from "date-fns"

export function dayAndDateFormat(dt: number | Date) {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "iiii, MMM do")
	}
	return "--"
}

export function isoDayFormat(dt: number | Date) {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "yyyy-MM-dd")
	}
	return "--"
}
