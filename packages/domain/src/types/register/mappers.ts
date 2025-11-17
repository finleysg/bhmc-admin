import { HoleDto } from "../courses/hole.dto"
import { EventDto } from "../events/event.dto"
import { PlayerDto } from "./player.dto"
import { RegistrationSlotDto } from "./registration-slot.dto"

/**
 * Map DB player row -> PlayerDto
 *
 * Return only the fields required by PlayerDto to keep the mapper narrow
 * and avoid leaking DB schema into domain types.
 */
export function toPlayerDto(p: any): PlayerDto {
	return {
		id: p?.id,
		firstName: p?.firstName ?? p?.first_name ?? null,
		lastName: p?.lastName ?? p?.last_name ?? null,
		birthDate: p?.birthDate ?? p?.birth_date ?? null,
		email: p?.email ?? "",
		phoneNumber: p?.phoneNumber ?? p?.phone_number ?? null,
		ghin: p?.ghin ?? null,
		tee: p?.tee ?? "",
		isMember: p?.isMember ?? p?.is_member ?? false,
		ggId: p?.ggId ?? p?.gg_id ?? null,
		userId: p?.userId ?? p?.user_id ?? null,
	}
}

/**
 * Map DB event row -> EventDto
 * Accepts a loose DB shape (any) and picks the fields domain functions need.
 */
export function toEventDto(e: any): EventDto {
	return {
		id: e?.id,
		eventType: e?.eventType ?? e?.event_type ?? "",
		startType: e?.startType ?? e?.start_type ?? null,
		startTime: e?.startTime ?? e?.start_time ?? null,
		teeTimeSplits: e?.teeTimeSplits ?? e?.tee_time_splits ?? null,
		starterTimeInterval: Number(e?.starterTimeInterval ?? e?.starter_time_interval ?? 0) || 0,
		teamSize: e?.teamSize ?? e?.team_size ?? 1,
		canChoose: e?.canChoose ?? e?.can_choose ?? 0,
		name: e?.name ?? "",
		rounds: e?.rounds ?? null,
		registrationType: e?.registrationType ?? e?.registration_type ?? "",
		skinsType: e?.skinsType ?? e?.skins_type ?? null,
		minimumSignupGroupSize: e?.minimumSignupGroupSize ?? e?.minimum_signup_group_size ?? null,
		maximumSignupGroupSize: e?.maximumSignupGroupSize ?? e?.maximum_signup_group_size ?? null,
		groupSize: e?.groupSize ?? e?.group_size ?? null,
		totalGroups: e?.totalGroups ?? e?.total_groups ?? null,
		ghinRequired: e?.ghinRequired ?? e?.ghin_required ?? false,
		seasonPoints: e?.seasonPoints ?? e?.season_points ?? null,
		notes: e?.notes ?? null,
		startDate: e?.startDate ?? e?.start_date ?? "",
		signupStart: e?.signupStart ?? e?.signup_start ?? null,
		signupEnd: e?.signupEnd ?? e?.signup_end ?? null,
		paymentsEnd: e?.paymentsEnd ?? e?.payments_end ?? null,
		registrationMaximum: e?.registrationMaximum ?? e?.registration_maximum ?? null,
		portalUrl: e?.portalUrl ?? e?.portal_url ?? null,
		externalUrl: e?.externalUrl ?? e?.external_url ?? null,
		status: e?.status ?? "",
		season: e?.season ?? 0,
		prioritySignupStart: e?.prioritySignupStart ?? e?.priority_signup_start ?? null,
		ageRestriction: e?.ageRestriction ?? e?.age_restriction ?? 0,
		ageRestrictionType: e?.ageRestrictionType ?? e?.age_restriction_type ?? "",
		ggId: e?.ggId ?? e?.gg_id ?? null,
		courses: e?.courses ?? [],
		eventFees: e?.eventFees ?? [],
	}
}

/**
 * Map DB registration slot -> RegistrationSlotDto
 */
export function toRegistrationSlotDto(s: any): RegistrationSlotDto {
	return {
		id: s?.id,
		registrationId: s?.registrationId ?? s?.registration_id ?? 0,
		eventId: s?.eventId ?? s?.event_id ?? 0,
		startingOrder: Number(s?.startingOrder ?? s?.starting_order ?? 0),
		slot: Number(s?.slot ?? s?.Slot ?? 0),
		status: s?.status ?? "",
		holeId: s?.holeId ?? s?.hole_id ?? null,
		hole: s?.hole ?? null,
		playerId: s?.playerId ?? s?.player_id ?? null,
		player: s?.player ?? null,
		ggId: s?.ggId ?? s?.gg_id ?? null,
		fees: s?.fees ?? [],
	}
}

/**
 * Map DB hole -> HoleDto
 */
export function toHoleDto(h: any): HoleDto {
	return {
		id: h?.id,
		courseId: h?.courseId ?? h?.course_id ?? 0,
		holeNumber: Number(h?.holeNumber ?? h?.hole_number ?? 0),
		par: h?.par ?? 0,
	}
}
