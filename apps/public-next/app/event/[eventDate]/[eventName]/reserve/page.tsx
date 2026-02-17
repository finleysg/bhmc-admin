"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { isBefore } from "date-fns"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getEventUrl } from "@/lib/event-utils"
import { useRegistrationSlots } from "@/lib/hooks/use-registration-slots"
import { useRegistrationSSE } from "@/lib/hooks/use-registration-sse"
import { useRegistration } from "@/lib/registration/registration-context"
import type { ReserveSlot } from "@/lib/registration/reserve-utils"
import { loadReserveTables } from "@/lib/registration/reserve-utils"
import type { ClubEventDetail, Course } from "@/lib/types"
import { RegistrationPageWrapper } from "../components/registration-page-wrapper"
import { ReserveGrid } from "../components/reserve-grid"

export default function ReservePage() {
	return (
		<RegistrationPageWrapper>{(event) => <ReserveContent event={event} />}</RegistrationPageWrapper>
	)
}

function ReserveContent({ event }: { event: ClubEventDetail }) {
	const router = useRouter()
	const eventUrl = getEventUrl(event)
	const { createRegistration, setError } = useRegistration()
	const { data: slots, isLoading, refetch } = useRegistrationSlots(event.id)
	const [isReserving, setIsReserving] = useState(false)

	// Guard: redirect if payments window closed
	useEffect(() => {
		if (event.payments_end && isBefore(new Date(event.payments_end), new Date())) {
			router.replace(eventUrl)
		}
	}, [event.payments_end, eventUrl, router])

	// SSE for live updates
	const handleSSEUpdate = useCallback(() => {
		void refetch()
	}, [refetch])

	useRegistrationSSE({
		eventId: event.id,
		enabled: true,
		onUpdate: handleSSEUpdate,
	})

	const tables = useMemo(() => {
		if (!slots) return []
		return loadReserveTables(event, slots)
	}, [event, slots])

	const handleReserve = useCallback(
		(course: Course, selectedSlots: ReserveSlot[]) => {
			setIsReserving(true)
			const registrationSlots = selectedSlots
				.filter((s) => !s.registrationId)
				.map((s) => ({ id: s.id }))
			createRegistration(course, registrationSlots)
				.then(() => {
					router.push(`${eventUrl}/register`)
				})
				.catch((err: unknown) => {
					const message = err instanceof Error ? err.message : "Failed to reserve"
					toast.error(message)
					setError(message)
				})
				.finally(() => {
					setIsReserving(false)
				})
		},
		[createRegistration, eventUrl, router, setError],
	)

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="font-heading text-lg font-semibold">
					{event.name} - Select Starting Position
				</h2>
				<div className="flex gap-2">
					<Button variant="secondary" size="sm" onClick={() => router.push(eventUrl)}>
						Back
					</Button>
					<Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isReserving}>
						<RefreshCw className="mr-1 size-4" />
						Refresh
					</Button>
				</div>
			</div>
			<ReserveGrid tables={tables} mode="edit" onReserve={handleReserve} />
		</div>
	)
}
