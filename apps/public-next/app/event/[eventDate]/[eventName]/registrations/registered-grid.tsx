"use client"

import type { ReserveTable } from "@/lib/registration/reserve-utils"
import { SlotCell } from "../components/slot-cell"
import { TeeSheetTabs } from "../components/tee-sheet-tabs"

export function RegisteredGrid({ tables }: { tables: ReserveTable[] }) {
	return (
		<TeeSheetTabs
			tables={tables}
			renderSlot={(slot, table) => (
				<SlotCell key={slot.id} slot={slot} courseColor={table.course.color ?? undefined} />
			)}
		/>
	)
}
