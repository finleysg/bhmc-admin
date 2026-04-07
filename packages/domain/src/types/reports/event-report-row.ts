export interface EventReportRow {
	teamId: string
	session: string
	course: string
	start: string
	ghin: string
	age: string
	tee: string
	lastName: string
	firstName: string
	fullName: string
	email: string
	signedUpBy: string
	signupDate: string
	[feeName: string]: string | undefined
}
