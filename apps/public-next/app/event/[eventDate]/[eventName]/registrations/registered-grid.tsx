"use client"

import { useState } from "react"

import type { ReserveTable } from "@/lib/registration/reserve-utils"
import { RegistrationStatus } from "@/lib/registration/types"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface RegisteredGridProps {
	tables: ReserveTable[]
}

export function RegisteredGrid({ tables }: RegisteredGridProps) {
	const [selectedCourse, setSelectedCourse] = useState(tables[0]?.course.name ?? "")

	if (tables.length === 0) {
		return (
			<Card>
				<CardContent>
					<p className="text-muted-foreground">The teesheet has not yet been created.</p>
				</CardContent>
			</Card>
		)
	}

	const hasTabs = tables.length > 1

	return (
		<div>
			{hasTabs ? (
				<Tabs value={selectedCourse} onValueChange={setSelectedCourse}>
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
									<GridBody table={table} />
								</CardContent>
							</Card>
						</TabsContent>
					))}
				</Tabs>
			) : (
				<Card>
					<CardContent>
						<GridBody table={tables[0]} />
					</CardContent>
				</Card>
			)}
		</div>
	)
}

function SlotCell({ slot }: { slot: ReserveTable["groups"][number]["slots"][number] }) {
	const isReserved =
		slot.status === RegistrationStatus.Reserved ||
		slot.status === RegistrationStatus.Processing
	return (
		<div
			className={cn(
				"flex min-w-[140px] flex-1 items-center justify-center rounded-md border px-3 py-2 text-center text-sm",
				!isReserved && "bg-muted/30",
			)}
		>
			{isReserved && slot.playerName ? (
				<span className="font-medium text-secondary">{slot.playerName}</span>
			) : (
				<span className="text-muted-foreground">{slot.statusName}</span>
			)}
		</div>
	)
}

function GridBody({ table }: { table: ReserveTable }) {
	return (
		<div>
			{/* Desktop: horizontal rows */}
			<div className="hidden space-y-0.5 sm:block">
				{table.groups.map((group) => (
					<div key={group.id} className="flex items-stretch gap-1">
						<div className="flex w-20 shrink-0 items-center font-semibold text-sm text-primary">
							{group.name}
						</div>
						<div className="flex flex-1 gap-1">
							{group.slots.map((slot) => (
								<SlotCell key={slot.id} slot={slot} />
							))}
						</div>
					</div>
				))}
			</div>

			{/* Mobile: vertical stacked groups */}
			<div className="space-y-3 sm:hidden">
				{table.groups.map((group) => (
					<div key={group.id}>
						<div className="font-semibold text-sm text-primary mb-1">
							{group.name}
						</div>
						<div className="space-y-1">
							{group.slots.map((slot) => (
								<SlotCell key={slot.id} slot={slot} />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
