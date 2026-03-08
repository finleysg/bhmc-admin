import { useQuery } from "@tanstack/react-query"

import type {
	ServerPlayer,
	ServerRegistration,
	ServerRegistrationFee,
	ServerRegistrationSlot,
} from "../registration/types"

export interface PlayerRegistrationResponse {
	registration: ServerRegistration
}

// Django API response types (snake_case)
interface DjangoPlayer {
	id: number
	email: string | null
	first_name: string
	last_name: string
	ghin: string | null
	birth_date: string | null
	phone_number: string | null
	tee: string | null
	is_member: boolean | number
	last_season: number | null
}

interface DjangoFee {
	id: number
	event_fee: number
	registration_slot: number | null
	payment: number | null
	is_paid: boolean
	amount: string | null
}

interface DjangoSlot {
	id: number
	event: number
	registration: number | null
	hole: number | null
	player: DjangoPlayer | null
	starting_order: number
	slot: number
	status: string
	fees: DjangoFee[]
}

interface DjangoRegistration {
	id: number
	event: number
	course: number | null
	signed_up_by: string
	expires: string | null
	notes: string | null
	created_date: string
	slots: DjangoSlot[]
}

function transformPlayer(p: DjangoPlayer): ServerPlayer {
	return {
		id: p.id,
		email: p.email,
		firstName: p.first_name,
		lastName: p.last_name,
		ghin: p.ghin,
		birthDate: p.birth_date,
		phoneNumber: p.phone_number,
		tee: p.tee,
		isMember: p.is_member,
		lastSeason: p.last_season,
	}
}

function transformFee(f: DjangoFee): ServerRegistrationFee {
	return {
		id: f.id,
		eventFeeId: f.event_fee,
		registrationSlotId: f.registration_slot,
		paymentId: f.payment,
		isPaid: f.is_paid,
		amount: f.amount,
	}
}

function transformSlot(s: DjangoSlot): ServerRegistrationSlot {
	return {
		id: s.id,
		eventId: s.event,
		registrationId: s.registration,
		holeId: s.hole,
		player: s.player ? transformPlayer(s.player) : null,
		startingOrder: s.starting_order,
		slot: s.slot,
		status: s.status,
		fees: s.fees?.map(transformFee) ?? [],
	}
}

function transformRegistration(r: DjangoRegistration): ServerRegistration {
	return {
		id: r.id,
		eventId: r.event,
		courseId: r.course,
		signedUpBy: r.signed_up_by,
		expires: r.expires ?? "",
		notes: r.notes,
		createdDate: r.created_date,
		slots: r.slots.map(transformSlot),
	}
}

export function usePlayerRegistration(eventId: number | undefined, playerId: number | undefined) {
	return useQuery({
		queryKey: ["player-registration", eventId, playerId],
		queryFn: async () => {
			const params = new URLSearchParams()
			if (eventId) params.set("event_id", String(eventId))
			if (playerId) params.set("player_id", String(playerId))
			const response = await fetch(`/api/registration?${params.toString()}`)
			if (!response.ok) {
				if (response.status === 404) return null
				throw new Error("Failed to fetch registration")
			}
			const data = (await response.json()) as DjangoRegistration[]
			if (!data || data.length === 0) return null
			return { registration: transformRegistration(data[0]) } as PlayerRegistrationResponse
		},
		enabled: !!eventId && !!playerId,
	})
}
