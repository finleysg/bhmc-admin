"use client"

import { useState, useTransition } from "react"
import { Ban, CircleCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { calculateTeeTime, getStatusName, registrationHasStarted } from "@repo/domain/functions"
import {
	RegistrationStatusChoices,
	StartTypeChoices,
	type ClubEvent,
	type RegistrationSlot,
	type SlotGroup,
	type SlotGroupSlot,
} from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/shadcn/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import type { FormState } from "@/lib/form-state"

import { appendTeeTime, createSlots, deleteSlotGroup, setSlotGroupStatus } from "../actions"

const { AVAILABLE, UNAVAILABLE } = RegistrationStatusChoices

/** The tee time for a tee-time group, or the hole and wave (A/B) for a shotgun group. */
export function groupLabel(event: ClubEvent, group: SlotGroup): string {
	if (event.startType === StartTypeChoices.SHOTGUN) {
		return `Hole ${group.holeNumber}${group.startingOrder === 0 ? "A" : "B"}`
	}
	try {
		return calculateTeeTime(event, { startingOrder: group.startingOrder } as RegistrationSlot)
	} catch {
		return `Tee time ${group.startingOrder + 1}`
	}
}

function useSlotAction() {
	const [isPending, startTransition] = useTransition()
	const run = (action: () => Promise<FormState>, onDone?: (result: FormState) => void) =>
		startTransition(async () => {
			const result = await action()
			if (result.status === "success") toast.success(result.message)
			// A caller with its own error display (a dialog) shows the error there instead.
			else if (!onDone) toast.error(result.message)
			onDone?.(result)
		})
	return { isPending, run }
}

export function SlotsPanel({ event, groups }: { event: ClubEvent; groups: SlotGroup[] }) {
	const { isPending, run } = useSlotAction()
	const started = registrationHasStarted(event)
	const isTeeTimes = event.startType === StartTypeChoices.TEETIMES

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-4">
				<p className="text-sm text-muted-foreground">
					Players choose these slots when they register.{" "}
					{started
						? "Registration has opened: tee times can still be added and groups disabled, but slots can no longer be created or deleted."
						: "Disable a group to hold it back; delete it to remove it."}
				</p>
				<div className="flex shrink-0 gap-2">
					{groups.length === 0 ? (
						<Button
							size="sm"
							disabled={isPending || started}
							onClick={() => run(() => createSlots(event.id))}
						>
							{isPending ? "Creating..." : "Create slots"}
						</Button>
					) : (
						isTeeTimes && (
							<Button
								size="sm"
								disabled={isPending}
								onClick={() => run(() => appendTeeTime(event.id))}
							>
								{isPending ? "Adding..." : "Add tee time"}
							</Button>
						)
					)}
				</div>
			</div>

			{groups.length === 0 ? (
				<p className="py-4 text-center text-muted-foreground">
					No slots yet. Set the group size, start type, and courses first.
				</p>
			) : (
				<TeeSheet event={event} groups={groups} started={started} />
			)}
		</div>
	)
}

interface CourseSheet {
	courseId: number
	name: string
	color?: string | null
	groups: SlotGroup[]
}

/** Groups by course, in the order the API returns them, with each course's colour. */
function courseSheets(event: ClubEvent, groups: SlotGroup[]): CourseSheet[] {
	const sheets = new Map<number, CourseSheet>()
	for (const group of groups) {
		const sheet = sheets.get(group.courseId) ?? {
			courseId: group.courseId,
			name: group.courseName,
			color: event.courses?.find((c) => c.id === group.courseId)?.color,
			groups: [],
		}
		sheet.groups.push(group)
		sheets.set(group.courseId, sheet)
	}
	return [...sheets.values()]
}

/** A read-only tee sheet like the public site's: one tab per course, one row per group. */
function TeeSheet({
	event,
	groups,
	started,
}: {
	event: ClubEvent
	groups: SlotGroup[]
	started: boolean
}) {
	const sheets = courseSheets(event, groups)
	const [selected, setSelected] = useState(String(sheets[0].courseId))
	const body = (sheet: CourseSheet) => (
		<CourseSheetBody event={event} sheet={sheet} started={started} />
	)

	if (sheets.length === 1) return body(sheets[0])

	return (
		<Tabs value={selected} onValueChange={setSelected}>
			<TabsList>
				{sheets.map((sheet) => (
					<TabsTrigger
						key={sheet.courseId}
						value={String(sheet.courseId)}
						style={
							selected === String(sheet.courseId) && sheet.color
								? { backgroundColor: `${sheet.color}20`, color: sheet.color }
								: undefined
						}
					>
						{sheet.name}
					</TabsTrigger>
				))}
			</TabsList>
			{sheets.map((sheet) => (
				<TabsContent key={sheet.courseId} value={String(sheet.courseId)} className="pt-2">
					{body(sheet)}
				</TabsContent>
			))}
		</Tabs>
	)
}

function CourseSheetBody({
	event,
	sheet,
	started,
}: {
	event: ClubEvent
	sheet: CourseSheet
	started: boolean
}) {
	return (
		<div className="space-y-3 sm:space-y-1">
			{sheet.groups.map((group) => (
				<div
					key={`${group.holeId}-${group.startingOrder}`}
					className="sm:flex sm:items-center sm:gap-1"
					data-testid="tee-sheet-row"
				>
					<div className="mb-1 text-sm font-semibold text-primary sm:mb-0 sm:w-20 sm:shrink-0">
						{groupLabel(event, group)}
					</div>
					<div className="space-y-1 sm:flex sm:flex-1 sm:gap-1 sm:space-y-0">
						{group.slots.map((slot) => (
							<SlotCell key={slot.id} slot={slot} courseColor={sheet.color} />
						))}
					</div>
					<div className="mt-1 flex justify-end gap-1 sm:mt-0 sm:h-8 sm:w-28 sm:shrink-0">
						<GroupActions event={event} group={group} started={started} />
					</div>
				</div>
			))}
		</div>
	)
}

/** One slot: the player's name once taken, otherwise the slot's status. */
function SlotCell({ slot, courseColor }: { slot: SlotGroupSlot; courseColor?: string | null }) {
	const isOpen = slot.status === AVAILABLE
	return (
		<div className="flex min-w-24 flex-1 items-center justify-center rounded-md border bg-muted/30 px-2 py-1 text-center text-xs">
			{slot.playerName ? (
				<span className="truncate font-medium text-secondary" title={slot.playerName}>
					{slot.playerName}
				</span>
			) : (
				<span
					className={isOpen ? undefined : "text-muted-foreground"}
					style={isOpen && courseColor ? { color: courseColor } : undefined}
				>
					{getStatusName(slot.status)}
				</span>
			)}
		</div>
	)
}

function GroupActions({
	event,
	group,
	started,
}: {
	event: ClubEvent
	group: SlotGroup
	started: boolean
}) {
	const { isPending, run } = useSlotAction()
	const open = group.statusCounts[AVAILABLE] ?? 0
	const disabled = group.statusCounts[UNAVAILABLE] ?? 0
	const deletable = !started && group.filled === 0 && open === group.total

	return (
		<>
			{open > 0 && (
				<Button
					size="icon-sm"
					variant="ghost"
					aria-label="Disable"
					title="Disable the group's open slots"
					disabled={isPending}
					onClick={() =>
						run(() => setSlotGroupStatus(event.id, group.holeId, group.startingOrder, UNAVAILABLE))
					}
				>
					<Ban />
				</Button>
			)}
			{disabled > 0 && (
				<Button
					size="icon-sm"
					variant="ghost"
					aria-label="Enable"
					title="Make the group's unavailable slots available"
					disabled={isPending}
					onClick={() =>
						run(() => setSlotGroupStatus(event.id, group.holeId, group.startingOrder, AVAILABLE))
					}
				>
					<CircleCheck />
				</Button>
			)}
			{deletable && <DeleteGroupDialog event={event} group={group} />}
		</>
	)
}

function DeleteGroupDialog({ event, group }: { event: ClubEvent; group: SlotGroup }) {
	const [open, setOpen] = useState(false)
	const [error, setError] = useState<string>()
	const { isPending, run } = useSlotAction()
	const label = groupLabel(event, group)

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				setError(undefined)
			}}
		>
			<DialogTrigger asChild>
				<Button size="icon-sm" variant="ghost" aria-label="Delete" title="Delete the group">
					<Trash2 />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Delete {label} on {group.courseName}?
					</DialogTitle>
					<DialogDescription>
						Its {group.total} empty slots are deleted. To hold the group back instead, disable it.
					</DialogDescription>
				</DialogHeader>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<DialogFooter>
					<Button
						variant="destructive"
						disabled={isPending}
						onClick={() =>
							run(
								() => deleteSlotGroup(event.id, group.holeId, group.startingOrder),
								(result) =>
									result.status === "success" ? setOpen(false) : setError(result.message),
							)
						}
					>
						{isPending ? "Deleting..." : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
