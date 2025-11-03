/**
 * Dto types for Golf Genius API responses.
 * Keep these narrow: only the fields our application consumes.
 */

import { CustomFields } from "./golf-genius.dto"

export interface MemberDto {
	memberCardId: string
	handicapNetworkId?: string | null
	email?: string | null
	firstName: string
	lastName: string
}

export interface MasterRosterItemDto {
	member?: MemberDto
}

export interface RosterMemberDto {
	id: string
	firstName: string
	lastName: string
	email?: string | null
	ghin?: string | null
}

export interface SeasonDto {
	id: string
	name: string
	current: boolean
	archived: boolean
}

export interface EventDto {
	id: string
	name: string
	ggid: string
	startDate: string
	endDate: string
	website?: string | null
}

export interface RoundDto {
	id: string
	index: number
	date: string
	eventId: string
}

export interface TournamentDto {
	id: string
	name: string
	scoreFormat: string
	handicapFormat: string
}

export interface RosterMemberSyncDto {
	externalId: string | number
	lastName: string
	firstName: string
	email: string
	gender: string // always "M" for us
	handicapNetworkId?: string | null // ghin
	rounds: string[] // array of round ids
	customFields: CustomFields
}

/**
 * Allowed action names for integration logging
 */
export type IntegrationActionName =
	| "Event Synced"
	| "Roster Exported"
	| "Scores Imported"
	| "Results Imported"
	| "Event Completed"

/**
 * DTO for creating integration log entries
 */
export interface CreateIntegrationLogDto {
	actionName: IntegrationActionName
	actionDate: string
	details?: string | null
	eventId: number
	isSuccessful: boolean
}

/**
 * DTO for integration log entries
 */
export interface IntegrationLogDto {
	id: number
	actionName: IntegrationActionName
	actionDate: string
	details: string | null
	eventId: number
	isSuccessful: boolean
}
