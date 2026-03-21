"use client"

import { type ReactNode, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReserveGroup, ReserveTable } from "@/lib/registration/reserve-utils"
import { cn } from "@/lib/utils"
import { TeeSheetBody } from "./tee-sheet-body"

interface TeeSheetTabsProps {
	tables: ReserveTable[]
	renderSlot: (slot: ReserveGroup["slots"][number], table: ReserveTable) => ReactNode
	renderGroupActions?: (group: ReserveGroup, table: ReserveTable) => ReactNode
	groupClassName?: (group: ReserveGroup) => string
	emptyMessage?: string
	className?: string
}

export function TeeSheetTabs({
	tables,
	renderSlot,
	renderGroupActions,
	groupClassName,
	emptyMessage = "The teesheet has not yet been created.",
	className,
}: TeeSheetTabsProps) {
	const [selectedCourse, setSelectedCourse] = useState(tables[0]?.course.name ?? "")

	if (tables.length === 0) {
		return (
			<Card className={className}>
				<CardContent>
					<p className="text-muted-foreground">{emptyMessage}</p>
				</CardContent>
			</Card>
		)
	}

	const renderTable = (table: ReserveTable) => (
		<TeeSheetBody
			table={table}
			renderSlot={(slot) => renderSlot(slot, table)}
			renderGroupActions={
				renderGroupActions ? (group) => renderGroupActions(group, table) : undefined
			}
			groupClassName={groupClassName}
		/>
	)

	if (tables.length === 1) {
		const course = tables[0].course
		return (
			<Card className={className}>
				<CardHeader
					className={cn("py-3", !course.color && "bg-primary/10")}
					style={course.color ? { backgroundColor: `${course.color}20` } : undefined}
				>
					<CardTitle className="text-base" style={course.color ? { color: course.color } : undefined}>
						{course.name}
					</CardTitle>
				</CardHeader>
				<CardContent>{renderTable(tables[0])}</CardContent>
			</Card>
		)
	}

	return (
		<Tabs value={selectedCourse} onValueChange={setSelectedCourse} className={className}>
			<TabsList>
				{tables.map((table) => (
					<TabsTrigger
						key={table.course.id}
						value={table.course.name}
						style={
							selectedCourse === table.course.name && table.course.color
								? {
										backgroundColor: `${table.course.color}20`,
										color: table.course.color,
									}
								: undefined
						}
					>
						{table.course.name}
					</TabsTrigger>
				))}
			</TabsList>
			{tables.map((table) => (
				<TabsContent key={table.course.id} value={table.course.name}>
					<Card>
						<CardContent>{renderTable(table)}</CardContent>
					</Card>
				</TabsContent>
			))}
		</Tabs>
	)
}
