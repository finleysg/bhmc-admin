import {
	EventDomainData,
	HoleDomainData,
	PlayerDomainData,
	RegistrationSlotDomainData,
} from "./types"

/**
 * Map DB player row -> PlayerDomainData
 *
 * Return only the fields required by PlayerDomainData to keep the mapper narrow
 * and avoid leaking DB schema into domain types.
 */
export function toPlayerDomain(p: any): PlayerDomainData {
	return {
		id: p?.id,
		firstName: p?.firstName ?? p?.first_name ?? null,
		lastName: p?.lastName ?? p?.last_name ?? null,
		birthDate: p?.birthDate ?? p?.birth_date ?? null,
	}
}

/**
 * Map DB event row -> EventDomainData
 * Accepts a loose DB shape (any) and picks the fields domain functions need.
 */
export function toEventDomain(e: any): EventDomainData {
	return {
		id: e?.id,
		eventType: e?.eventType ?? e?.event_type ?? "",
		startType: e?.startType ?? e?.start_type ?? null,
		startTime: e?.startTime ?? e?.start_time ?? null,
		teeTimeSplits: e?.teeTimeSplits ?? e?.tee_time_splits ?? null,
		starterTimeInterval: Number(e?.starterTimeInterval ?? e?.starter_time_interval ?? 0) || 0,
		teamSize: e?.teamSize ?? e?.team_size,
		canChoose: e?.canChoose ?? e?.can_choose ?? 0,
	}
}

/**
 * Map DB registration slot -> RegistrationSlotDomainData
 */
export function toSlotDomain(s: any): RegistrationSlotDomainData {
	return {
		id: s?.id,
		slot: Number(s?.slot ?? s?.Slot ?? 0),
		startingOrder: Number(s?.startingOrder ?? s?.starting_order ?? 0),
		holeId: s?.holeId ?? s?.hole_id ?? null,
		registrationId: s?.registrationId ?? s?.registration_id ?? null,
		courseId: s?.courseId ?? s?.course_id ?? null,
	}
}

/**
 * Map DB hole -> HoleDomainData
 */
export function toHoleDomain(h: any): HoleDomainData {
	return {
		id: h?.id,
		holeNumber: Number(h?.holeNumber ?? h?.hole_number ?? 0),
		courseId: h?.courseId ?? h?.course_id,
	}
}
