import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"

import { fetchDjango } from "@/lib/fetchers"
import { resolveEventFromParams } from "@/lib/event-utils"
import type { RegistrationSlot } from "@/lib/types"
import { loadReserveTables } from "@/lib/registration/reserve-utils"
import { RegistrationStatus } from "@/lib/registration/types"
import { RegisteredGrid } from "./registered-grid"
import { RegisteredList } from "./registered-list"

interface DjangoRegistrationSlot {
	id: number
	event: number
	registration: number | null
	hole: number | null
	starting_order: number
	slot: number
	status: string
	player: {
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
	} | null
}

interface DjangoRegistration {
	id: number
	event: number
	course: number | null
	signed_up_by: string
	expires: string
	notes: string | null
	created_date: string
	slots: DjangoRegistrationSlot[]
}

export interface Reservation {
	registrationId: number
	slotId: number
	playerId: number
	name: string
	sortName: string
	signedUpBy: string
	signupDate: string
}

function convertRegistrationsToReservations(registrations: DjangoRegistration[]): Reservation[] {
	const reservations: Reservation[] = []
	for (const reg of registrations) {
		for (const slot of reg.slots) {
			if (slot.status === RegistrationStatus.Reserved && slot.player) {
				reservations.push({
					registrationId: reg.id,
					slotId: slot.id,
					playerId: slot.player.id,
					name: `${slot.player.first_name} ${slot.player.last_name}`,
					sortName: `${slot.player.last_name}, ${slot.player.first_name}`,
					signedUpBy: reg.signed_up_by,
					signupDate: reg.created_date,
				})
			}
		}
	}
	return reservations
}

interface RegistrationsPageProps {
	params: Promise<{ eventDate: string; eventName: string }>
}

export default async function RegistrationsPage({ params }: RegistrationsPageProps) {
	const { eventDate, eventName } = await params
	const event = await resolveEventFromParams(eventDate, eventName)

	const eventDetailUrl = `/event/${eventDate}/${eventName}`

	let content: React.ReactNode
	if (event.can_choose) {
		const slots = await fetchDjango<RegistrationSlot[]>(
			`/registration-slots/?event_id=${event.id}`,
			{ revalidate: 0 },
		)
		const tables = loadReserveTables(event, slots)
		content = <RegisteredGrid tables={tables} />
	} else {
		const registrations = await fetchDjango<DjangoRegistration[]>(
			`/registration/?event_id=${event.id}`,
			{ revalidate: 0 },
		)
		const reservations = convertRegistrationsToReservations(registrations)
		content = <RegisteredList reservations={reservations} eventName={event.name} />
	}

	return (
		<>
			<div className="mb-4 flex gap-4">
				<Link
					href={eventDetailUrl}
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					Event Details
				</Link>
				<Link
					href="/"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<Home className="size-4" />
					Home
				</Link>
			</div>
			{content}
		</>
	)
}
