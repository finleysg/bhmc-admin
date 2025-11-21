export interface GgHandicapDto {
	handicap_network_id: string
	handicap_index: string
}

export type CustomFields = Record<string, string | null>

export interface GgMemberDto {
	id: string
	member_card_id: string
	external_id?: string | null
	name: string
	first_name: string
	last_name: string
	email?: string | null
	handicap: GgHandicapDto
	custom_fields: CustomFields

	// Allow extra dynamic fields without validation here
	[key: string]: unknown
}

export interface GgCreateMemberDto {
	external_id?: string | null
	first_name: string
	last_name: string
	email?: string | null
	gender: string
	handicap_network_id?: string | null
	rounds: string[]
	custom_fields: CustomFields
}

export interface GgTeeSheetPlayerDto {
	name: string
	handicap_network_id: string
	external_id?: string | null
	player_roster_id: string
	handicap_index: string
	course_handicap: string
	score_array: (number | null)[]
	handicap_dots_by_hole: number[]
	tee: {
		id: string
		course_id: string
	}
}

export interface GgSeasonDto {
	id: string
	name: string
	current: boolean
	archived: boolean
}

export interface GgEventDto {
	id: string
	name: string
	ggid: string
	start_date: string
	end_date: string
	website: string
}

export interface GgRoundDto {
	index: number
	id: string
	event_id: string
	name: string
	date: string
	status: string
}

export interface GgTournamentDto {
	name?: string | null
	id?: string | null
	score_format?: string | null
	handicap_format?: string | null
	score_scope?: string | null
}
