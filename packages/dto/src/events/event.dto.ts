export interface EventDto {
	id?: number
	eventType: string
	name: string
	rounds?: number | null
	registrationType: string
	skinsType?: string | null
	minimumSignupGroupSize?: number | null
	maximumSignupGroupSize?: number | null
	groupSize?: number | null
	totalGroups?: number | null
	startType?: string | null
	canChoose: boolean
	ghinRequired: boolean
	seasonPoints?: number | null
	notes?: string | null
	startDate: string
	startTime?: string | null
	signupStart?: string | null
	signupEnd?: string | null
	paymentsEnd?: string | null
	registrationMaximum?: number | null
	portalUrl?: string | null
	externalUrl?: string | null
	status: string
	season: number
	teeTimeSplits?: string | null
	starterTimeInterval: number
	teamSize: number
	prioritySignupStart?: string | null
	ageRestriction?: number | null
	ageRestrictionType: string
	ggId?: string | null
}
