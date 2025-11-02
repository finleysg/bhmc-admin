import { PlayerDomainData } from "./types"

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
