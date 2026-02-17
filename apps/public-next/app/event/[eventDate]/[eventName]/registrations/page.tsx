"use client"

import { useCallback, useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { getEventUrl } from "@/lib/event-utils"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { useEventRegistrations } from "@/lib/hooks/use-event-registrations"
import { useRegistrationSlots } from "@/lib/hooks/use-registration-slots"
import { RegistrationProvider } from "@/lib/registration/registration-provider"
import { loadReserveTables } from "@/lib/registration/reserve-utils"
import type { ClubEventDetail } from "@/lib/types"
import { ReserveGrid } from "../components/reserve-grid"

export default function RegistrationsPage() {
	const { event, isLoading } = useEventFromParams()

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	if (!event) {
		return (
			<div className="py-8 text-center">
				<h2 className="text-lg font-semibold">Event not found</h2>
			</div>
		)
	}

	if (event.can_choose) {
		return (
			<RegistrationProvider clubEvent={event}>
				<CanChooseView event={event} />
			</RegistrationProvider>
		)
	}

	return <RegistrationListView event={event} />
}

function CanChooseView({ event }: { event: ClubEventDetail }) {
	const { data: slots, isLoading } = useRegistrationSlots(event.id)
	const eventUrl = getEventUrl(event)

	const tables = useMemo(() => {
		if (!slots) return []
		return loadReserveTables(event, slots)
	}, [event, slots])

	const noop = useCallback(() => {}, [])

	if (isLoading) {
		return <Skeleton className="h-48 w-full" />
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="font-heading text-lg font-semibold">{event.name} - Registered Players</h2>
				<Button variant="secondary" size="sm" asChild>
					<Link href={eventUrl}>Back</Link>
				</Button>
			</div>
			<ReserveGrid tables={tables} mode="view" onReserve={noop} />
		</div>
	)
}

function RegistrationListView({ event }: { event: ClubEventDetail }) {
	const { data: registrations, isLoading } = useEventRegistrations(event.id)
	const eventUrl = getEventUrl(event)

	const rows = useMemo(() => {
		if (!registrations) return []
		return registrations.flatMap((reg) =>
			reg.slots
				.filter((slot) => slot.player)
				.map((slot) => ({
					slotId: slot.id,
					playerName: `${slot.player!.lastName}, ${slot.player!.firstName}`,
					signupDate: reg.createdDate,
					signedUpBy: reg.signedUpBy,
				})),
		)
	}, [registrations])

	const sortedRows = useMemo(
		() => [...rows].sort((a, b) => a.playerName.localeCompare(b.playerName)),
		[rows],
	)

	if (isLoading) {
		return <Skeleton className="h-48 w-full" />
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>{event.name} - Registered Players</CardTitle>
				<Button variant="secondary" size="sm" asChild>
					<Link href={eventUrl}>Back</Link>
				</Button>
			</CardHeader>
			<CardContent>
				{sortedRows.length === 0 ? (
					<p className="text-muted-foreground">No sign ups yet.</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Player</TableHead>
								<TableHead>Signup Date</TableHead>
								<TableHead>Signed Up By</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedRows.map((row) => (
								<TableRow key={row.slotId}>
									<TableCell className="font-medium">{row.playerName}</TableCell>
									<TableCell>{format(new Date(row.signupDate), "MM/dd/yyyy h:mm a")}</TableCell>
									<TableCell>{row.signedUpBy}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	)
}
