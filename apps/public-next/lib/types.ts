export interface PageContent {
	id: number
	key: string
	title: string
	content: string
}

export interface AnnouncementDocument {
	id: number
	title: string
	document_type: string
	file: string
	year?: number | null
	last_update: string
}

export interface Announcement {
	id: number
	title: string
	text: string
	visibility: string
	starts: string
	expires: string
	documents: AnnouncementDocument[]
}

export interface Policy {
	id: number
	policy_type: string
	title: string
	description: string
}

export interface PlayerSummary {
	id: number
	first_name: string
	last_name: string
	email?: string | null
	is_member: boolean
	birth_date?: string | null
	last_season?: number | null
}

export interface BoardMember {
	id: number
	player: PlayerSummary
	role: string
	term_expires: number
}

export interface Ace {
	id: number
	player: PlayerSummary
	season: number
	hole_name: string
	shot_date: string
}

export interface LowScore {
	id: number
	player: PlayerSummary
	season: number
	course_name: string
	is_net: boolean
	score: number
}

export interface ClubEvent {
	id: number
	event_type: string
	name: string
	season: number
	start_date: string
	status: string
}

export interface StaticDocumentFile {
	id: number
	title: string
	file: string
	document_type: string
	last_update: string
}

export interface StaticDocument {
	id: number
	code: string
	document: StaticDocumentFile
}

export interface PhotoData {
	id: number
	year: number
	caption: string | null
	mobile_url: string
	web_url: string
	image_url: string
}

export interface Tag {
	id: number
	name: string
}

export interface PhotoTag {
	id: number
	document_id: number
	tag_id: number
}

export interface FeeType {
	id: number
	name: string
	code: string
	restriction: string
}

export interface EventFee {
	id: number
	event: number
	fee_type: FeeType
	amount: string
	is_required: boolean
	display_order: number
	override_amount: string | null
	override_restriction: string | null
}

export interface Hole {
	id: number
	course_id: number
	hole_number: number
	par: number
}

export interface Tee {
	id: number
	course_id: number
	name: string
	gg_id: string | null
	color: string | null
}

export interface Course {
	id: number
	name: string
	number_of_holes: number
	gg_id: string | null
	color: string | null
	holes: Hole[]
	tees: Tee[]
}

export interface EventSessionFeeOverride {
	id: number
	session: number
	event_fee: number
	amount: string
}

export interface EventSession {
	id: number
	event: number
	name: string
	registration_limit: number
	display_order: number
	fee_overrides: EventSessionFeeOverride[]
}

export interface ClubEventDetail {
	id: number
	name: string
	rounds: number | null
	ghin_required: boolean
	total_groups: number | null
	status: string
	minimum_signup_group_size: number | null
	maximum_signup_group_size: number | null
	group_size: number | null
	start_type: string | null
	can_choose: boolean
	registration_window: string
	external_url: string | null
	season: number
	tee_time_splits: string | null
	notes: string | null
	event_type: string
	skins_type: string | null
	season_points: number | null
	portal_url: string | null
	priority_signup_start: string | null
	start_date: string
	start_time: string | null
	registration_type: string
	signup_start: string | null
	signup_end: string | null
	signup_waves: number | null
	payments_end: string | null
	registration_maximum: number | null
	courses: Course[]
	fees: EventFee[]
	sessions?: EventSession[]
	default_tag: string | null
	starter_time_interval: number
	team_size: number | null
	age_restriction: number | null
	age_restriction_type: string
}

export interface RegistrationSlotPlayer {
	id: number
	first_name: string
	last_name: string
	email: string | null
	phone_number: string | null
	ghin: string | null
	tee: string | null
	birth_date: string | null
	is_member: boolean
	last_season: number | null
}

export interface RegistrationSlot {
	id: number
	event: number
	registration: number | null
	hole: number | null
	starting_order: number
	slot: number
	status: string
	session: number | null
	player: RegistrationSlotPlayer | null
}

export interface MajorChampion {
	id: number
	season: number
	event: number | null
	event_name: string
	event_display_name: string | null
	event_start_date: string | null
	flight: string
	player: PlayerSummary
	team_id: string | null
	score: number
	is_net: boolean
}

export interface DamCupResult {
	id: number
	season: number
	good_guys: string
	bad_guys: string
	site: string
}

export interface TopPointsEntry {
	id: number
	first_name: string
	last_name: string
	total_points: number
}

export interface Document {
	id: number
	year: number | null
	title: string
	document_type: string
	file: string
	event: number | null
	event_type: string | null
	created_by: string
	last_update: string
}

export interface PaginatedResponse<T> {
	count: number
	next: string | null
	previous: string | null
	results: T[]
}

export interface PlayerDetail {
	id: number
	first_name: string
	last_name: string
	email: string
	phone_number: string | null
	ghin: string | null
	tee: string | null
	birth_date: string | null
	save_last_card: boolean
	profile_picture: PhotoData | null
	is_member: boolean
	last_season: number | null
}

// Score types
export interface ScoreCourse {
	id: number
	name: string
	number_of_holes: number
	color: string | null
}

export interface ScoreTee {
	id: number
	course: number
	name: string
	gg_id: string | null
	color: string | null
}

export interface HoleScoreData {
	id: number
	hole: Hole
	score: number
	is_net: boolean
}

export interface PlayerRoundData {
	id: number
	event: number
	player: number
	course: ScoreCourse
	tee: ScoreTee
	handicap_index: string | null
	course_handicap: number
	scores: HoleScoreData[]
}

// Tournament types
export interface TournamentNested {
	id: number
	event: number
	round: number | null
	name: string
	format: string | null
	is_net: boolean
	gg_id: string | null
}

export interface TournamentResultData {
	id: number
	tournament: TournamentNested
	player: number
	team_id: string | null
	position: number
	score: number | null
	amount: string
	payout_type: string | null
	payout_to: string | null
	payout_status: string | null
	flight: string | null
	summary: string | null
	details: string | null
}

export interface TournamentPointsData {
	id: number
	tournament: TournamentNested
	player: number
	position: number
	score: number | null
	points: number
	details: string | null
	create_date: string
}

// Aggregation types for Results page
export interface PayoutLineItem {
	label: string
	amount: number
	payoutType: string
	payoutStatus: string
}

export interface EventResultSummary {
	eventId: number
	eventName: string
	eventDate: string
	grossScore: number | null
	grossPosition: number | null
	netScore: number | null
	netPosition: number | null
	grossPoints: number | null
	netPoints: number | null
	grossPointsDetails: string | null
	netPointsDetails: string | null
	payouts: PayoutLineItem[]
}
