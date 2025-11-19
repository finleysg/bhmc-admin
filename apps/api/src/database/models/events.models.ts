import {
	IsDecimal,
	IsInt,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from "class-validator"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"

import {
	event,
	eventFee,
	feeType,
	round,
	tournament,
	tournamentPoints,
	tournamentResult,
} from "../schema"
import { CourseModel } from "./courses.models"

export const eventInsertSchema = createInsertSchema(event)
export const eventUpdateSchema = createUpdateSchema(event)
export const eventFeeInsertSchema = createInsertSchema(eventFee)
export const eventFeeUpdateSchema = createUpdateSchema(eventFee)
export const feeTypeInsertSchema = createInsertSchema(feeType)
export const feeTypeUpdateSchema = createUpdateSchema(feeType)
export const roundInsertSchema = createInsertSchema(round)
export const roundUpdateSchema = createUpdateSchema(round)
export const tournamentInsertSchema = createInsertSchema(tournament)
export const tournamentUpdateSchema = createUpdateSchema(tournament)
export const tournamentPointsInsertSchema = createInsertSchema(tournamentPoints)
export const tournamentPointsUpdateSchema = createUpdateSchema(tournamentPoints)
export const tournamentResultInsertSchema = createInsertSchema(tournamentResult)
export const tournamentResultUpdateSchema = createUpdateSchema(tournamentResult)

// Main ClubEvent Model
export class EventModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsString()
	@MaxLength(1)
	eventType!: string

	@IsString()
	@MaxLength(100)
	name!: string

	@IsOptional()
	@IsInt()
	rounds?: number

	@IsString()
	@MaxLength(1)
	registrationType!: string

	@IsOptional()
	@IsString()
	@MaxLength(1)
	skinsType?: string

	@IsOptional()
	@IsInt()
	minimumSignupGroupSize?: number

	@IsOptional()
	@IsInt()
	maximumSignupGroupSize?: number

	@IsOptional()
	@IsInt()
	groupSize?: number

	@IsOptional()
	@IsInt()
	totalGroups?: number

	@IsOptional()
	@IsString()
	@MaxLength(2)
	startType?: string

	@IsNumber()
	@Min(0)
	@Max(1)
	canChoose!: number

	@IsNumber()
	@Min(0)
	@Max(1)
	ghinRequired!: number

	@IsOptional()
	@IsInt()
	seasonPoints?: number

	@IsOptional()
	@IsString()
	notes?: string

	@IsString()
	startDate!: string // Date as string

	@IsOptional()
	@IsString()
	@MaxLength(40)
	startTime?: string

	@IsOptional()
	@IsString()
	signupStart?: string // Datetime as string

	@IsOptional()
	@IsString()
	signupEnd?: string // Datetime as string

	@IsOptional()
	@IsString()
	paymentsEnd?: string // Datetime as string

	@IsOptional()
	@IsInt()
	registrationMaximum?: number

	@IsOptional()
	@IsString()
	@MaxLength(240)
	portalUrl?: string

	@IsOptional()
	@IsString()
	@MaxLength(255)
	externalUrl?: string

	@IsString()
	@MaxLength(1)
	status!: string

	@IsInt()
	season!: number

	@IsOptional()
	@IsString()
	@MaxLength(10)
	teeTimeSplits?: string

	@IsInt()
	starterTimeInterval!: number

	@IsInt()
	teamSize!: number

	@IsOptional()
	@IsString()
	prioritySignupStart?: string // Datetime as string

	@IsOptional()
	@IsInt()
	ageRestriction?: number

	@IsString()
	@MaxLength(1)
	ageRestrictionType!: string

	@IsOptional()
	@IsString()
	@MaxLength(22)
	ggId?: string

	@IsOptional()
	courses?: CourseModel[]

	@IsOptional()
	eventFees?: EventFeeModel[]

	@IsOptional()
	eventRounds?: RoundModel[]

	@IsOptional()
	tournaments?: TournamentModel[]
}

// ClubEvent Courses Junction
export class EventCourseModel {
	@IsInt()
	id!: number

	@IsInt()
	eventId!: number

	@IsInt()
	courseId!: number
}

// Fee Type (lookup)
export class FeeTypeModel {
	@IsInt()
	id!: number

	@IsString()
	@MaxLength(30)
	name!: string

	@IsString()
	@MaxLength(3)
	code!: string

	@IsString()
	@MaxLength(10)
	payout!: string

	@IsString()
	@MaxLength(20)
	restriction!: string
}

// ClubEvent Fee
export class EventFeeModel {
	@IsInt()
	id!: number

	@IsNumber()
	amount!: number

	@IsNumber()
	@Min(0)
	@Max(1)
	isRequired!: number

	@IsInt()
	displayOrder!: number

	@IsInt()
	eventId!: number

	@IsInt()
	feeTypeId!: number

	@IsOptional()
	@IsNumber()
	overrideAmount?: number

	@IsOptional()
	@IsString()
	@MaxLength(20)
	overrideRestriction?: string

	@IsOptional()
	feeType?: FeeTypeModel
}

// ClubEvent Fee Override
export class EventFeeOverrideModel {
	@IsInt()
	id!: number

	@IsNumber()
	amount!: number

	@IsString()
	@MaxLength(20)
	restriction!: string
}

// Round
export class RoundModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsInt()
	roundNumber!: number

	@IsString()
	roundDate!: string // Date as string

	@IsString()
	@MaxLength(22)
	ggId!: string

	@IsInt()
	eventId!: number

	@IsOptional()
	tournaments?: TournamentModel[]
}

// Tournament
export class TournamentModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsString()
	@MaxLength(120)
	name!: string

	@IsString()
	@MaxLength(20)
	format!: string

	@IsNumber()
	@Min(0)
	@Max(1)
	isNet!: number

	@IsString()
	@MaxLength(22)
	ggId!: string

	@IsInt()
	eventId!: number

	@IsInt()
	roundId!: number

	@IsOptional()
	results?: TournamentResultModel[]

	@IsOptional()
	points?: TournamentPointsModel[]
}

// Tournament Result
export class TournamentResultModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsOptional()
	@IsString()
	@MaxLength(20)
	flight?: string

	@IsInt()
	position!: number

	@IsOptional()
	@IsInt()
	score?: number

	@IsString()
	@IsDecimal()
	amount!: string // decimal as string

	@IsOptional()
	@IsString()
	@MaxLength(120)
	details?: string

	@IsInt()
	playerId!: number

	@IsInt()
	tournamentId!: number

	@IsOptional()
	@IsString()
	@MaxLength(22)
	teamId?: string

	@IsOptional()
	@IsString()
	createDate?: string // Datetime as string

	@IsOptional()
	@IsString()
	payoutDate?: string // Datetime as string

	@IsOptional()
	@IsString()
	@MaxLength(10)
	payoutStatus?: string

	@IsOptional()
	@IsString()
	@MaxLength(10)
	payoutTo?: string

	@IsOptional()
	@IsString()
	@MaxLength(10)
	payoutType?: string

	@IsOptional()
	@IsString()
	@MaxLength(40)
	summary?: string
}

// Tournament Points
export class TournamentPointsModel {
	@IsOptional()
	@IsInt()
	id?: number

	@IsInt()
	position!: number

	@IsOptional()
	@IsInt()
	score?: number

	@IsInt()
	points!: number

	@IsString()
	createDate!: string // Datetime as string

	@IsOptional()
	@IsString()
	@MaxLength(120)
	details?: string

	@IsInt()
	tournamentId!: number

	@IsInt()
	playerId!: number
}
