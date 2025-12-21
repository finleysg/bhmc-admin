import { Type as TransformerType } from "class-transformer"
import {
	IsArray,
	IsBoolean,
	IsDateString,
	IsNumber,
	IsOptional,
	IsString,
	ValidateNested,
} from "class-validator"

import { Course } from "../courses/course"
import { EventFee } from "./event-fee"
import { Round } from "./round"
import { Tournament } from "./tournament"
import type {
	AgeRestrictionTypeValue,
	EventTypeValue,
	RegistrationTypeValue,
	SkinTypeValue,
	StartTypeValue,
} from "./choices"

export class ClubEvent {
	@IsNumber()
	id!: number

	@IsString()
	eventType!: EventTypeValue

	@IsString()
	name!: string

	@IsOptional()
	@IsNumber()
	rounds?: number | null

	@IsString()
	registrationType!: RegistrationTypeValue

	@IsOptional()
	@IsString()
	skinsType?: SkinTypeValue | null

	@IsOptional()
	@IsNumber()
	minimumSignupGroupSize?: number | null

	@IsOptional()
	@IsNumber()
	maximumSignupGroupSize?: number | null

	@IsOptional()
	@IsNumber()
	groupSize?: number | null

	@IsOptional()
	@IsNumber()
	totalGroups?: number | null

	@IsOptional()
	@IsString()
	startType?: StartTypeValue | null

	@IsBoolean()
	canChoose!: boolean

	@IsBoolean()
	ghinRequired!: boolean

	@IsOptional()
	@IsNumber()
	seasonPoints?: number | null

	@IsOptional()
	@IsString()
	notes?: string | null

	@IsDateString()
	startDate!: string

	@IsOptional()
	@IsString()
	startTime?: string | null

	@IsOptional()
	@IsDateString()
	signupStart?: string | null

	@IsOptional()
	@IsDateString()
	signupEnd?: string | null

	@IsOptional()
	@IsDateString()
	paymentsEnd?: string | null

	@IsOptional()
	@IsNumber()
	registrationMaximum?: number | null

	@IsOptional()
	@IsString()
	portalUrl?: string | null

	@IsOptional()
	@IsString()
	externalUrl?: string | null

	@IsString()
	status!: string

	@IsNumber()
	season!: number

	@IsOptional()
	@IsString()
	teeTimeSplits?: string | null

	@IsNumber()
	starterTimeInterval!: number

	@IsNumber()
	teamSize!: number

	@IsOptional()
	@IsDateString()
	prioritySignupStart?: string | null

	@IsOptional()
	@IsNumber()
	ageRestriction?: number | null

	@IsString()
	ageRestrictionType!: AgeRestrictionTypeValue

	@IsOptional()
	@IsString()
	ggId?: string | null

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@TransformerType(() => Course)
	courses?: Course[]

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@TransformerType(() => EventFee)
	eventFees?: EventFee[]

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@TransformerType(() => Round)
	eventRounds?: Round[]

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@TransformerType(() => Tournament)
	tournaments?: Tournament[]
}
