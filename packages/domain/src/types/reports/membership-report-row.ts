export interface MembershipReportRow {
	ghin: string
	age: string
	tee: string
	lastName: string
	firstName: string
	fullName: string
	email: string
	signedUpBy: string
	signupDate: string
	type: string
	notes: string
	[feeName: string]: string | undefined
}
