import { format, isDate, isValid } from "date-fns"

const isoDayFormat = (dt: number | Date) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "yyyy-MM-dd")
	}
	return "--"
}

const dayAndDateFormat = (dt: number | Date) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "iiii, MMM do")
	}
	return "--"
}

const dayDateAndTimeFormat = (dt: number | Date | null | undefined) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "iiii, MMM d h:mm aaaa")
	}
	return "--"
}

const sortableDateAndTimeFormat = (dt: number | Date) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "yyyy-MM-dd hh:mm")
	}
	return ""
}

const dayNameFormat = (dt: number | Date) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "iiii")
	}
	return "--"
}

const shortDayNameFormat = (dt: number | Date) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "iii")
	}
	return "--"
}

const monthNameFormat = (dt: number | Date) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "MMMM")
	}
	return "--"
}

const shortMonthNameFormat = (dt: number | Date) => {
	if (dt && isDate(dt) && isValid(dt)) {
		return format(dt, "MMM")
	}
	return "--"
}

export {
	dayAndDateFormat,
	dayDateAndTimeFormat,
	dayNameFormat,
	isoDayFormat,
	monthNameFormat,
	shortDayNameFormat,
	shortMonthNameFormat,
	sortableDateAndTimeFormat,
}
