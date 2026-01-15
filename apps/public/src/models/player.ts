import { differenceInYears, getYear, lastDayOfYear } from "date-fns"
import { immerable } from "immer"
import { z } from "zod"

import * as config from "../utils/app-config"
import { FeeRestriction } from "./codes"
import { Photo, PhotoApiSchema } from "./photo"

const currentYear = getYear(Date.now())

export const PlayerApiSchema = z.object({
	id: z.number(),
	email: z.string().nullish(),
	first_name: z.string(),
	last_name: z.string(),
	ghin: z.string().nullish(),
	birth_date: z.string().nullish(),
	phone_number: z.string().nullish(),
	tee: z.string().nullish(),
	is_member: z.boolean().or(z.number()),
	last_season: z.number().nullish(),
	profile_picture: PhotoApiSchema.nullish(),
})

// Result of a successful account registration
export const GuestPlayerApiSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "An email is required.")
		.email("Please provide a valid email address."),
	first_name: z.string().trim().min(1, "A first name is required."),
	last_name: z.string().trim().min(1, "A last name is required."),
	ghin: z.string().optional(),
})

export type PlayerApiData = z.infer<typeof PlayerApiSchema>
export type GuestPlayerData = z.infer<typeof GuestPlayerApiSchema>

/* The data from serverUrl (nestjs backend) uses standard js/ts naming conventions */
export const ServerPlayerApiSchema = z.object({
	id: z.number(),
	email: z.string().nullish(),
	firstName: z.string(),
	lastName: z.string(),
	ghin: z.string().nullish(),
	birthDate: z.string().nullish(),
	phoneNumber: z.string().nullish(),
	tee: z.string().nullish(),
	isMember: z.boolean().or(z.number()),
	lastSeason: z.number().nullish(),
})

export type ServerPlayerData = z.infer<typeof ServerPlayerApiSchema>

export class Player {
	[immerable] = true

	id: number
	email?: string
	firstName: string
	lastName: string
	name: string
	ghin?: string | null
	birthDay?: string | null
	birthDate?: Date
	phoneNumber?: string | null
	tee?: string | null
	isMember: boolean
	isReturningMember: boolean
	lastSeason?: number | null
	age?: number
	ageAtYearEnd?: number
	profilePicture?: Photo | null
	isFriend: boolean
	data?: PlayerApiData | null

	constructor(json: PlayerApiData | undefined | null, isFriend?: boolean) {
		this.id = json?.id ?? 0
		this.email = json?.email ?? ""
		this.firstName = json?.first_name ?? ""
		this.lastName = json?.last_name ?? ""
		this.name = json?.id ? `${json.first_name} ${json.last_name}` : "Guest"
		this.ghin = json?.ghin
		this.birthDay = json?.birth_date
		this.birthDate = json?.birth_date ? new Date(json.birth_date) : undefined
		this.phoneNumber = json?.phone_number
		this.tee = json?.tee ?? "Club"
		this.age = this.birthDate ? differenceInYears(new Date(), this.birthDate) : undefined
		this.ageAtYearEnd = this.birthDate
			? differenceInYears(lastDayOfYear(new Date()), this.birthDate)
			: undefined
		this.isMember = Boolean(json?.is_member) ?? false
		this.isReturningMember = json?.last_season === currentYear - 1
		this.lastSeason = json?.last_season
		this.profilePicture = json?.profile_picture && new Photo(json.profile_picture)
		this.isFriend = isFriend ?? false
		this.data = json
	}

	evaluateRestriction = (restriction: string) => {
		switch (restriction) {
			case FeeRestriction.Seniors:
				return (this.age ?? 0) >= config.seniorRateAge
			case FeeRestriction.NonSeniors:
				return (this.age ?? 0) < config.seniorRateAge
			case FeeRestriction.NewMembers:
				return !this.isReturningMember
			case FeeRestriction.ReturningMembers:
				return this.isReturningMember
			case FeeRestriction.Members:
				return this.isMember
			case FeeRestriction.NonMembers:
				return !this.isMember
			default:
				return false
		}
	}

	static fromServerData = (json: ServerPlayerData) => {
		const player = new Player(undefined)
		player.id = json.id
		player.email = json.email ?? ""
		player.firstName = json.firstName
		player.lastName = json.lastName
		player.name = json.id ? `${json.firstName} ${json.lastName}` : "Guest"
		player.ghin = json.ghin
		player.birthDay = json.birthDate
		player.birthDate = json.birthDate ? new Date(json.birthDate) : undefined
		player.phoneNumber = json.phoneNumber
		player.tee = json.tee ?? "Club"
		player.age = player.birthDate ? differenceInYears(new Date(), player.birthDate) : undefined
		player.ageAtYearEnd = player.birthDate
			? differenceInYears(lastDayOfYear(new Date()), player.birthDate)
			: undefined
		player.isMember = Boolean(json.isMember) ?? false
		player.isReturningMember = json.lastSeason === currentYear - 1
		player.lastSeason = json.lastSeason

		return player
	}
}
