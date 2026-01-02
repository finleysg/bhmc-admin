/**
 * Drizzle row types and composition utilities.
 * Use these types instead of internal models for type-safe DB access.
 */
import {
	authUser,
	champion,
	course,
	event,
	eventFee,
	eventScore,
	eventScorecard,
	feeType,
	hole,
	integrationLog,
	lowScore,
	payment,
	player,
	refund,
	registration,
	registrationFee,
	registrationSlot,
	round,
	tee,
	tournament,
	tournamentPoints,
	tournamentResult,
} from "./schema"

// =============================================================================
// Row Types (from Drizzle $inferSelect - ID is always required)
// =============================================================================

// Events
export type EventRow = typeof event.$inferSelect
export type EventFeeRow = typeof eventFee.$inferSelect
export type FeeTypeRow = typeof feeType.$inferSelect
export type RoundRow = typeof round.$inferSelect
export type TournamentRow = typeof tournament.$inferSelect
export type TournamentResultRow = typeof tournamentResult.$inferSelect
export type TournamentPointsRow = typeof tournamentPoints.$inferSelect

// Courses
export type CourseRow = typeof course.$inferSelect
export type HoleRow = typeof hole.$inferSelect
export type TeeRow = typeof tee.$inferSelect

// Registration
export type PlayerRow = typeof player.$inferSelect
export type RegistrationRow = typeof registration.$inferSelect
export type RegistrationSlotRow = typeof registrationSlot.$inferSelect
export type RegistrationFeeRow = typeof registrationFee.$inferSelect
export type PaymentRow = typeof payment.$inferSelect
export type RefundRow = typeof refund.$inferSelect

// Scores
export type ScorecardRow = typeof eventScorecard.$inferSelect
export type ScoreRow = typeof eventScore.$inferSelect

// Core
export type ChampionRow = typeof champion.$inferSelect
export type LowScoreRow = typeof lowScore.$inferSelect

// Golf Genius
export type IntegrationLogRow = typeof integrationLog.$inferSelect

// Auth
export type AuthUserRow = typeof authUser.$inferSelect

// =============================================================================
// Insert Types (from Drizzle $inferInsert - ID is optional)
// =============================================================================

// Events
export type EventInsert = typeof event.$inferInsert
export type EventFeeInsert = typeof eventFee.$inferInsert
export type FeeTypeInsert = typeof feeType.$inferInsert
export type RoundInsert = typeof round.$inferInsert
export type TournamentInsert = typeof tournament.$inferInsert
export type TournamentResultInsert = typeof tournamentResult.$inferInsert
export type TournamentPointsInsert = typeof tournamentPoints.$inferInsert

// Courses
export type CourseInsert = typeof course.$inferInsert
export type HoleInsert = typeof hole.$inferInsert
export type TeeInsert = typeof tee.$inferInsert

// Registration
export type PlayerInsert = typeof player.$inferInsert
export type RegistrationInsert = typeof registration.$inferInsert
export type RegistrationSlotInsert = typeof registrationSlot.$inferInsert
export type RegistrationFeeInsert = typeof registrationFee.$inferInsert
export type PaymentInsert = typeof payment.$inferInsert
export type RefundInsert = typeof refund.$inferInsert

// Scores
export type ScorecardInsert = typeof eventScorecard.$inferInsert
export type ScoreInsert = typeof eventScore.$inferInsert

// Core
export type ChampionInsert = typeof champion.$inferInsert
export type LowScoreInsert = typeof lowScore.$inferInsert

// Golf Genius
export type IntegrationLogInsert = typeof integrationLog.$inferInsert

// Auth
export type AuthUserInsert = typeof authUser.$inferInsert

// =============================================================================
// Composition Utilities
// =============================================================================

/**
 * Generic wrapper to add required compositions to a base type.
 * Use this to create types that explicitly declare what relations are loaded.
 *
 * @example
 * type EventWithFees = WithCompositions<ClubEvent, { eventFees: EventFee[] }>
 */
export type WithCompositions<T, C extends Record<string, unknown>> = Omit<T, keyof C> & C

// =============================================================================
// Common Composition Patterns - Events
// =============================================================================

export type EventWithFees = WithCompositions<EventRow, { eventFees: EventFeeRow[] }>

export type EventWithCourses = WithCompositions<EventRow, { courses: CourseRow[] }>

export type EventWithRounds = WithCompositions<EventRow, { eventRounds: RoundRow[] }>

export type EventFull = WithCompositions<
	EventRow,
	{
		eventFees: EventFeeRow[]
		courses: CourseRow[]
		eventRounds: RoundRow[]
		tournaments: TournamentRow[]
	}
>

export type EventFeeWithType = WithCompositions<EventFeeRow, { feeType: FeeTypeRow }>

export type TournamentWithResults = WithCompositions<
	TournamentRow,
	{ results: TournamentResultRow[] }
>

export type TournamentResultsWithPlayer = WithCompositions<
	TournamentResultRow,
	{ player: PlayerRow }
>

// =============================================================================
// Common Composition Patterns - Courses
// =============================================================================

export type CourseWithHoles = WithCompositions<CourseRow, { holes: HoleRow[] }>

export type CourseWithTees = WithCompositions<CourseRow, { tees: TeeRow[] }>

export type CourseFull = WithCompositions<CourseRow, { holes: HoleRow[]; tees: TeeRow[] }>

// =============================================================================
// Common Composition Patterns - Registration
// =============================================================================

export type RegistrationWithSlots = WithCompositions<
	RegistrationRow,
	{ slots: RegistrationSlotRow[] }
>

export type RegistrationSlotWithPlayer = WithCompositions<
	RegistrationSlotRow,
	{ player: PlayerRow }
>

export type RegistrationSlotWithFees = WithCompositions<
	RegistrationSlotRow,
	{ fees: RegistrationFeeRow[] }
>

export type RegistrationSlotWithHole = WithCompositions<RegistrationSlotRow, { hole: HoleRow }>

export type RegistrationSlotFull = WithCompositions<
	RegistrationSlotRow,
	{ player: PlayerRow; fees: RegistrationFeeRow[] }
>

export type RegistrationFeeWithEventFee = WithCompositions<
	RegistrationFeeRow,
	{ eventFee: EventFeeRow }
>

export type RegistrationFull = WithCompositions<RegistrationRow, { slots: RegistrationSlotFull[] }>

export type CompleteRegistrationFeeRow = {
	fee: RegistrationFeeRow
	eventFee: EventFeeRow
	feeType: FeeTypeRow
}

export type CompleteRegistrationSlotRow = WithCompositions<
	RegistrationSlotRow,
	{
		player: PlayerRow
		hole: HoleRow | null
		fees: CompleteRegistrationFeeRow[]
	}
>

export type CompleteRegistrationRow = WithCompositions<
	RegistrationRow,
	{
		course: CourseRow | null
		slots: CompleteRegistrationSlotRow[]
	}
>

export type PaymentRowWithDetails = WithCompositions<
	PaymentRow,
	{ paymentDetails: RegistrationFeeRow[] }
>

// =============================================================================
// Common Composition Patterns - Scores
// =============================================================================

export type ScorecardWithScores = WithCompositions<ScorecardRow, { scores: ScoreRow[] }>

export type ScorecardFull = WithCompositions<
	ScorecardRow,
	{ scores: ScoreRow[]; player: PlayerRow }
>
