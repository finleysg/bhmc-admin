"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getEventUrl, getRegistrationStartTime } from "@/lib/event-utils"
import { useRegistrationSlots } from "@/lib/hooks/use-registration-slots"
import { useRegistration } from "@/lib/registration/registration-context"
import {
	getWaveUnlockTimes,
	loadReserveTables,
	type ReserveSlot,
} from "@/lib/registration/reserve-utils"
import type { ClubEventDetail, Course } from "@/lib/types"
import { ReserveGrid } from "../components/reserve-grid"

interface ReservePageContentProps {
	event: ClubEventDetail
}

const SLOT_CONFLICT_PREFIX = "One or more of the slots"

export function ReservePageContent({ event }: ReservePageContentProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { createRegistration, sseConnected, setError } = useRegistration()
	const { data: slots = [] } = useRegistrationSlots(event.id, {
		refetchInterval: sseConnected ? false : 15_000,
	})

	const tables = useMemo(() => loadReserveTables(event, slots), [event, slots])
	const waveUnlockTimes = useMemo(() => getWaveUnlockTimes(event), [event])
	const registrationStartTime = getRegistrationStartTime(event)

	const [isReserving, setIsReserving] = useState(false)

	const handleReserve = async (course: Course, selectedSlots: ReserveSlot[]) => {
		if (isReserving) return
		const group = tables.flatMap((t) => t.groups).find((g) => g.id === selectedSlots[0]?.groupId)
		const slotIds = selectedSlots.filter((s) => !s.playerId).map((s) => ({ id: s.id }))
		const selectedStart = `${event.name}: ${course.name} ${group?.name ?? ""}`

		setIsReserving(true)
		try {
			const registration = await createRegistration(course, slotIds, selectedStart)
			// Belt-and-braces: only navigate if we actually received a registration with
			// all the slots we asked for. Anything else means the hold did not succeed
			// at the database level and the user must pick a different tee time.
			if (!registration || registration.slots.length !== slotIds.length) {
				toast.error(
					"Those tee times were just reserved by another player. Please choose another tee time.",
				)
				await queryClient.invalidateQueries({
					queryKey: ["event-registration-slots", event.id],
				})
				return
			}
			router.replace(`${getEventUrl(event)}/register`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			const isSlotConflict = message.startsWith(SLOT_CONFLICT_PREFIX)
			toast.error(
				isSlotConflict
					? "Those tee times were just reserved by another player. Please choose another tee time."
					: message || "Unable to reserve those tee times. Please try again.",
			)
			// Clear the provider error so the user is not double-notified after retrying.
			setError(null)
			await queryClient.invalidateQueries({
				queryKey: ["event-registration-slots", event.id],
			})
		} finally {
			setIsReserving(false)
		}
	}

	return (
		<div>
			<Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
				<ArrowLeft className="mr-1 h-4 w-4" />
				Back
			</Button>
			<ReserveGrid
				tables={tables}
				mode="edit"
				onReserve={(course, selectedSlots) => {
					void handleReserve(course, selectedSlots)
				}}
				waveUnlockTimes={waveUnlockTimes}
				registrationStartTime={registrationStartTime}
			/>
		</div>
	)
}
