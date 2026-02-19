import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import type { ReserveGroup, ReserveTable } from "@/lib/registration/reserve-utils"

interface TeeSheetBodyProps {
	table: ReserveTable
	renderSlot: (slot: ReserveGroup["slots"][number]) => ReactNode
	renderGroupActions?: (group: ReserveGroup) => ReactNode
	groupClassName?: (group: ReserveGroup) => string
}

export function TeeSheetBody({
	table,
	renderSlot,
	renderGroupActions,
	groupClassName,
}: TeeSheetBodyProps) {
	return (
		<div>
			{/* Desktop: horizontal rows */}
			<div className="hidden space-y-1 sm:block">
				{table.groups.map((group) => (
					<div
						key={group.id}
						className={cn("flex items-center gap-1", groupClassName?.(group))}
					>
						<div className="flex w-20 shrink-0 items-center font-semibold text-sm text-primary">
							{group.name}
						</div>
						{renderGroupActions?.(group)}
						<div className="flex flex-1 gap-1">
							{group.slots.map((slot) => renderSlot(slot))}
						</div>
					</div>
				))}
			</div>

			{/* Mobile: vertical stacked groups */}
			<div className="space-y-3 sm:hidden">
				{table.groups.map((group) => (
					<div key={group.id} className={cn(groupClassName?.(group))}>
						<div className="flex items-center gap-2 font-semibold text-sm text-primary mb-1">
							{group.name}
							{renderGroupActions?.(group)}
						</div>
						<div className="space-y-1">
							{group.slots.map((slot) => renderSlot(slot))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
