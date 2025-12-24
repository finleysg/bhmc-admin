import type { GgSeason, GgSeasonWrapper } from "./season"
import type { GgEvent, GgEventWrapper } from "./event"
import type { GgRound, GgRoundWrapper } from "./round"
import type { GgTournament, GgTournamentWrapper } from "./tournament"
import type { GgMember, GgMemberWrapper } from "./member"
import type { GgPairingGroup, GgPairingGroupWrapper } from "./teesheet"
import type { GgTournamentResult, GgTournamentResultWrapper } from "./results"
import type { GgCourse, GgCoursesResponse } from "./course"

export const unwrapSeasons = (wrapped: GgSeasonWrapper[]): GgSeason[] =>
	wrapped.map((w) => w.season)

export const unwrapEvents = (wrapped: GgEventWrapper[]): GgEvent[] => wrapped.map((w) => w.event)

export const unwrapRounds = (wrapped: GgRoundWrapper[]): GgRound[] => wrapped.map((w) => w.round)

// Note: tournaments use "event" wrapper key
export const unwrapTournaments = (wrapped: GgTournamentWrapper[]): GgTournament[] =>
	wrapped.map((w) => w.event)

export const unwrapMembers = (wrapped: GgMemberWrapper[]): GgMember[] =>
	wrapped.map((w) => w.member)

export const unwrapPairingGroups = (wrapped: GgPairingGroupWrapper[]): GgPairingGroup[] =>
	wrapped.map((w) => w.pairing_group)

// Note: tournament results use "event" wrapper key
export const unwrapTournamentResult = (wrapped: GgTournamentResultWrapper): GgTournamentResult =>
	wrapped.event

export const unwrapCourses = (wrapped: GgCoursesResponse): GgCourse[] => wrapped.courses
