/* eslint-disable @typescript-eslint/no-explicit-any */
import { differenceInYears, format, parseISO } from "date-fns"

import { ClubEvent } from "../../models/club-event"
import { EventFee } from "../../models/event-fee"
import { GetGroupStartName } from "../../models/reserve"
import { currentSeason } from "../../utils/app-config"
import { isoDayFormat, sortableDateAndTimeFormat } from "../../utils/date-utils"

const standardHeader = [
	"#",
	"Team ID",
	"GHIN",
	"Age",
	"Tee",
	"Last Name",
	"First Name",
	"Full Name",
	"Email",
	"Signed Up By",
	"Signup Date",
]
const canChooseHeader = [
	"#",
	"Team ID",
	"Course",
	"Start",
	"GHIN",
	"Age",
	"Tee",
	"Last Name",
	"First Name",
	"Full Name",
	"Email",
	"Signed Up By",
	"Signup Date",
]

/**
 * Format a cell value as currency.
 */
const currencyFormat = (value: number) => {
	return `$${value.toFixed(2)}`
}

const getStandardEventReportRow = (index: number, fees: EventFee[], obj: any) => {
	const values = []
	values.push(index)
	values.push(`id-${obj.registration_id}`)
	values.push(obj.ghin)
	if (obj.birth_date) {
		values.push(differenceInYears(new Date(), parseISO(obj.birth_date)))
	} else {
		values.push("n/a")
	}
	values.push(obj.tee)
	values.push(obj.last_name)
	values.push(obj.first_name)
	values.push(`${obj.first_name} ${obj.last_name}`)
	values.push(obj.email)
	values.push(obj.signed_up_by)
	values.push(isoDayFormat(parseISO(obj.signup_date)))

	fees.forEach((fee) => values.push(obj[fee.name]))

	return values
}

const getCanChooseEventReportRow = (index: number, clubEvent: ClubEvent, obj: any) => {
	const startName = GetGroupStartName(clubEvent, obj.hole_number, obj.starting_order)

	const values = []
	values.push(index)
	values.push(`${obj.course_name}-${startName}`)
	values.push(obj.course_name)
	values.push(startName)
	values.push(obj.ghin)
	if (obj.birth_date) {
		values.push(differenceInYears(new Date(), parseISO(obj.birth_date)))
	} else {
		values.push("n/a")
	}
	values.push(obj.tee)
	values.push(obj.last_name)
	values.push(obj.first_name)
	values.push(`${obj.first_name} ${obj.last_name}`)
	values.push(obj.email)
	values.push(obj.signed_up_by)
	values.push(isoDayFormat(parseISO(obj.signup_date)))

	clubEvent.fees.forEach((fee) => values.push(obj[fee.name]))

	return values
}

const getPaymentReportRow = (obj: any) => {
	const paymentAmount = !isNaN(obj.payment_amount) ? +obj.payment_amount : 0
	const transactionFee = !isNaN(obj.transaction_fee) ? +obj.transaction_fee : 0
	const refundAmount = !isNaN(obj.refund_amount) ? +obj.refund_amount : 0
	const values = []
	values.push(`${obj.first_name} ${obj.last_name}`)
	values.push(obj.id)
	values.push(obj.payment_code)
	values.push(format(parseISO(obj.payment_date), "yyyy-MM-dd hh:mm:ss"))
	if (obj.confirm_date) {
		values.push(format(parseISO(obj.confirm_date), "yyyy-MM-dd hh:mm:ss"))
	} else {
		values.push("n/a")
	}
	values.push(currencyFormat(paymentAmount))
	values.push(currencyFormat(transactionFee))
	values.push(currencyFormat(refundAmount))
	return values
}

const getSkinsReportRow = (clubEvent: ClubEvent, obj: any) => {
	const startName = clubEvent.canChoose
		? GetGroupStartName(clubEvent, obj.hole_number, obj.starting_order)
		: "n/a"

	const values = []
	values.push(obj.registration_id)
	values.push(obj.course_name)
	values.push(startName)
	values.push(`${obj.first_name} ${obj.last_name}`)
	values.push(obj.skins_type)
	values.push(+obj.is_paid === 1 ? "Paid" : "")
	values.push(sortableDateAndTimeFormat(parseISO(obj.payment_date)))

	clubEvent.fees.forEach((fee) => values.push(obj[fee.name]))

	return values
}

const getEventReportHeader = (clubEvent: ClubEvent) => {
	const feeNames = clubEvent?.fees?.map((f) => f.name) ?? []
	if (clubEvent?.canChoose) {
		return canChooseHeader.concat(feeNames)
	}
	return standardHeader.concat(feeNames)
}

const getSkinsReportHeader = () => {
	return ["Group", "Course", "Start", "Player", "Skins Type", "Paid", "Payment Date"]
}

const getPaymentReportHeader = () => {
	return [
		"Player",
		"Id",
		"Payment Code",
		"Payment Date",
		"Confirm Date",
		"Amount Paid",
		"Transaction Fee",
		"Refunded",
	]
}

const getPaymentDetailHeader = () => {
	return ["Event Fee", "Amount", "Player", "Paid"]
}

const getRefundDetailHeader = () => {
	return ["Amount", "Date", "Issuer", "Code", "Notes", "Confirmed"]
}

const getMembershipReportHeader = () => {
	return [
		"#",
		"Registration Id",
		"GHIN",
		"Last Name",
		"First Name",
		"Email",
		"Birth Date",
		"Tee",
		"Signed Up By",
		"Signup Date",
		"Returning",
		"New",
	]
}

const getEventReportRows = (clubEvent: ClubEvent, reportData: any[]) => {
	return (
		reportData?.map((obj, index) =>
			clubEvent.canChoose
				? getCanChooseEventReportRow(index + 1, clubEvent, obj)
				: getStandardEventReportRow(index + 1, clubEvent.fees, obj),
		) ?? []
	)
}

const getPaymentReportRows = (reportData: any[]) => {
	return reportData?.map((obj: any) => getPaymentReportRow(obj)) ?? []
}

const getPaymentDetailRows = (reportData: any[]) => {
	return (
		reportData?.map((obj: any) => {
			const values = []
			values.push(obj.event_fee)
			values.push(currencyFormat(!isNaN(obj.amount_paid) ? +obj.amount_paid : 0))
			values.push(`${obj.first_name} ${obj.last_name}`)
			values.push(obj.is_paid ? "✔️" : "")
			return values
		}) ?? []
	)
}

const getRefundDetailRows = (reportData: any[]) => {
	return (
		reportData?.map((obj: any) => {
			const values = []
			values.push(currencyFormat(!isNaN(obj.refund_amount) ? +obj.refund_amount : 0))
			values.push(sortableDateAndTimeFormat(parseISO(obj.refund_date)))
			values.push(obj.issuer_last_name)
			values.push(obj.refund_code)
			values.push(obj.notes)
			values.push(obj.confirmed ? "✔️" : "")
			return values
		}) ?? []
	)
}

const getSkinsReportRows = (clubEvent: ClubEvent, reportData: any[]) => {
	return reportData?.map((obj) => getSkinsReportRow(clubEvent, obj)) ?? []
}

const getMembershipReportRow = (obj: any, index: number) => {
	const values = []
	values.push(index)
	values.push(obj.registration_id)
	values.push(obj.ghin)
	values.push(obj.last_name)
	values.push(obj.first_name)
	values.push(obj.email)
	try {
		values.push(isoDayFormat(parseISO(obj.birth_date)))
	} catch (err) {
		values.push("n/a")
	}
	values.push(obj.tee)
	values.push(obj.signed_up_by)
	values.push(isoDayFormat(parseISO(obj.signup_date)))
	// == is intentional here
	if (obj.last_season == currentSeason - 1) {
		values.push("✔️")
		values.push("")
	} else {
		values.push("")
		values.push("✔️")
	}
	return values
}

const getMembershipReportRows = (reportData: any[]) => {
	return reportData?.map((obj, index) => getMembershipReportRow(obj, index + 1))
}

export {
	getEventReportHeader,
	getEventReportRows,
	getMembershipReportHeader,
	getMembershipReportRows,
	getPaymentDetailHeader,
	getPaymentDetailRows,
	getPaymentReportHeader,
	getPaymentReportRows,
	getRefundDetailHeader,
	getRefundDetailRows,
	getSkinsReportHeader,
	getSkinsReportRows,
}
