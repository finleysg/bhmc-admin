"use client"

import { useState, useTransition } from "react"

import { getEventTypeName, parseLocalDate } from "@repo/domain/functions"
import type { ClubEvent } from "@repo/domain/types"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/shadcn/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"

import { listEventsForCopy, loadEventForCopy } from "../actions"

function seasons(): number[] {
	const years: number[] = []
	for (let y = new Date().getFullYear() + 1; y >= 2020; y--) years.push(y)
	return years
}

const formatDate = (date: string) =>
	parseLocalDate(date).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	})

/** Chooses an existing event, defaulting to the current season, and hands its setup to `onCopy`. */
export function CopyFromEventDialog({ onCopy }: { onCopy: (event: ClubEvent) => void }) {
	const [open, setOpen] = useState(false)
	const [season, setSeason] = useState(new Date().getFullYear())
	const [events, setEvents] = useState<ClubEvent[] | null>(null)
	const [error, setError] = useState<string>()
	const [isPending, startTransition] = useTransition()

	const load = (year: number) => {
		setSeason(year)
		setEvents(null)
		startTransition(async () => setEvents(await listEventsForCopy(year)))
	}

	const choose = (eventId: number) => {
		setError(undefined)
		startTransition(async () => {
			const event = await loadEventForCopy(eventId)
			if (!event) {
				setError("That event could not be loaded.")
				return
			}
			onCopy(event)
			setOpen(false)
		})
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next)
				setError(undefined)
				if (next && events === null) load(season)
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					Copy from event
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Copy from event</DialogTitle>
					<DialogDescription>
						Fills the form with the event&apos;s settings. Creating the event also copies its
						courses, fees, and sessions. Registrations and slots are never copied.
					</DialogDescription>
				</DialogHeader>
				<Select value={String(season)} onValueChange={(value) => load(Number(value))}>
					<SelectTrigger className="w-32" aria-label="Season">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{seasons().map((y) => (
							<SelectItem key={y} value={String(y)}>
								{y}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<div className="max-h-[50vh] overflow-y-auto rounded-md border">
					{events === null ? (
						<p className="p-4 text-center text-sm text-muted-foreground">Loading events...</p>
					) : events.length === 0 ? (
						<p className="p-4 text-center text-sm text-muted-foreground">No events in {season}.</p>
					) : (
						<ul className="divide-y">
							{events.map((event) => (
								<li key={event.id}>
									<button
										type="button"
										disabled={isPending}
										onClick={() => choose(event.id)}
										className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
									>
										<span className="w-24 shrink-0 text-muted-foreground">
											{formatDate(event.startDate)}
										</span>
										<span className="flex-1 font-medium">{event.name}</span>
										<span className="shrink-0 text-xs text-muted-foreground">
											{getEventTypeName(event.eventType)}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
