"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getRegistrationStartTime } from "@/lib/event-utils"
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

export function ReservePageContent({ event }: ReservePageContentProps) {
	const router = useRouter()
	const { createRegistration } = useRegistration()
	const { data: slots = [] } = useRegistrationSlots(event.id)

	const tables = useMemo(() => loadReserveTables(event, slots), [event, slots])
	const waveUnlockTimes = useMemo(() => getWaveUnlockTimes(event), [event])
	const registrationStartTime = getRegistrationStartTime(event)

	const handleReserve = (course: Course, selectedSlots: ReserveSlot[]) => {
		const group = tables.flatMap((t) => t.groups).find((g) => g.id === selectedSlots[0]?.groupId)
		const slotIds = selectedSlots.filter((s) => !s.playerId).map((s) => ({ id: s.id }))
		const selectedStart = `${event.name}: ${course.name} ${group?.name ?? ""}`

		void createRegistration(course, slotIds, selectedStart).then(
			() => router.replace("../register"),
			() => {
				// Error is handled by the registration provider
			},
		)
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
				onReserve={handleReserve}
				waveUnlockTimes={waveUnlockTimes}
				registrationStartTime={registrationStartTime}
			/>
		</div>
	)
}
