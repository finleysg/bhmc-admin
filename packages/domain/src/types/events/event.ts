import { Course } from "../courses/course"
import { EventFee } from "./event-fee"
import { Round } from "./round"
import { Tournament } from "./tournament"
import type {
	AgeRestrictionTypeValue,
	EventStatusValue,
	EventTypeValue,
	RegistrationTypeValue,
	SkinTypeValue,
	StartTypeValue,
} from "./choices"

export interface ClubEvent {
	id: number
	eventType: EventTypeValue
	name: string
	rounds?: number | null
	registrationType: RegistrationTypeValue
	skinsType?: SkinTypeValue | null
	minimumSignupGroupSize?: number | null
	maximumSignupGroupSize?: number | null
	groupSize?: number | null
	totalGroups?: number | null
	startType?: StartTypeValue | null
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
	status: EventStatusValue
	season: number
	teeTimeSplits?: string | null
	starterTimeInterval: number
	teamSize: number
	prioritySignupStart?: string | null
	ageRestriction?: number | null
	ageRestrictionType: AgeRestrictionTypeValue
	ggId?: string | null
	courses?: Course[]
	eventFees?: EventFee[]
	eventRounds?: Round[]
	tournaments?: Tournament[]
}
