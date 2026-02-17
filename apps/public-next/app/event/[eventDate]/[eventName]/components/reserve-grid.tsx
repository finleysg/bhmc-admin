"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRegistration } from "@/lib/registration/registration-context"
import type { ReserveSlot, ReserveTable } from "@/lib/registration/reserve-utils"
import type { Course } from "@/lib/types"
import { ReserveRow } from "./reserve-row"

interface ReserveGridProps {
	tables: ReserveTable[]
	mode: "view" | "edit"
	onReserve: (course: Course, slots: ReserveSlot[]) => void
}

export function ReserveGrid({ tables, mode, onReserve }: ReserveGridProps) {
	const { sseCurrentWave, error, setError } = useRegistration()
	const [selectedSlots, setSelectedSlots] = useState<ReserveSlot[]>([])

	// Clear selection on error
	if (error) {
		toast.error(error)
		setError(null)
		if (selectedSlots.length > 0) {
			// Clear selected state on slots
			selectedSlots.forEach((s) => {
				s.selected = false
			})
			setSelectedSlots([])
		}
	}

	const handleSelect = useCallback(
		(slots: ReserveSlot[]) => {
			if (mode === "view") return

			if (slots.length === 1) {
				const slot = slots[0]
				// Clear previous selections in other groups
				const sameGroup = selectedSlots.filter((ss) => ss.groupId === slot.groupId)
				selectedSlots.forEach((s) => {
					if (s.groupId !== slot.groupId) s.selected = false
				})

				slot.selected = !slot.selected
				if (slot.selected) {
					setSelectedSlots([...sameGroup, slot])
				} else {
					setSelectedSlots(sameGroup.filter((s) => s.id !== slot.id))
				}
			} else {
				// Multi-select: clear all, then select available
				selectedSlots.forEach((s) => {
					s.selected = false
				})
				const newSelected: ReserveSlot[] = []
				slots.forEach((slot) => {
					slot.selected = true
					newSelected.push(slot)
				})
				setSelectedSlots(newSelected)
			}
		},
		[mode, selectedSlots],
	)

	const handleReserve = useCallback(
		(table: ReserveTable) => {
			if (selectedSlots.length > 0) {
				onReserve(table.course, selectedSlots)
			}
		},
		[selectedSlots, onReserve],
	)

	if (tables.length === 0) return null

	if (tables.length === 1) {
		const table = tables[0]
		return (
			<Card className="mt-4">
				<CardContent>
					{table.groups.map((group) => (
						<ReserveRow
							key={group.id}
							group={group}
							mode={mode}
							currentWave={sseCurrentWave}
							onSelect={handleSelect}
							onReserve={() => handleReserve(table)}
						/>
					))}
				</CardContent>
			</Card>
		)
	}

	return (
		<Tabs defaultValue={tables[0].course.name} className="mt-4">
			<TabsList>
				{tables.map((table) => (
					<TabsTrigger key={table.course.id} value={table.course.name}>
						{table.course.name}
					</TabsTrigger>
				))}
			</TabsList>
			{tables.map((table) => (
				<TabsContent key={table.course.id} value={table.course.name}>
					<Card>
						<CardContent>
							{table.groups.map((group) => (
								<ReserveRow
									key={group.id}
									group={group}
									mode={mode}
									currentWave={sseCurrentWave}
									onSelect={handleSelect}
									onReserve={() => handleReserve(table)}
								/>
							))}
						</CardContent>
					</Card>
				</TabsContent>
			))}
		</Tabs>
	)
}
