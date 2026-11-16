"use client"

import { useRef, useState } from "react"

import { parseLocalDate } from "@repo/domain/functions"
import { EventStatusChoices, type ClubEvent, type ContentTag } from "@repo/domain/types"

import { Button } from "@/components/shadcn/button"
import { daysBetween, shiftByClubDays } from "@/lib/club-time"

import { EventSettingsForm } from "../../components/event-settings-form"
import { createEvent } from "../actions"

import { CopyFromEventDialog } from "./copy-from-event-dialog"

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`
const formatDate = (date: string) =>
	parseLocalDate(date).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})

/**
 * The new event's starting values when copying `source`. What belongs only to the
 * source (Golf Genius id, portal and external URLs, status) is not copied, and the
 * season stays the one chosen on the events list. With an event date already
 * entered, the source's signup, priority, and payments-end dates move with it
 * (same club time); without one, the event and signup dates start blank.
 */
export function copiedSettings(source: ClubEvent, season: number, startDate: string): ClubEvent {
	const days = startDate ? daysBetween(source.startDate, startDate) : null
	const date = (value: string | null | undefined) =>
		days === null ? null : shiftByClubDays(value, days)
	return {
		...source,
		season,
		status: EventStatusChoices.SCHEDULED,
		ggId: null,
		portalUrl: null,
		externalUrl: null,
		startDate: days === null ? "" : startDate,
		prioritySignupStart: date(source.prioritySignupStart),
		signupStart: date(source.signupStart),
		signupEnd: date(source.signupEnd),
		paymentsEnd: date(source.paymentsEnd),
	}
}

/** The new event form, optionally filled from an existing event ("pull"). */
export function NewEventForm({ season, tags }: { season: number; tags: ContentTag[] }) {
	const formArea = useRef<HTMLDivElement>(null)
	const [copy, setCopy] = useState<{ source: ClubEvent; defaults: ClubEvent } | null>(null)

	const copyFrom = (source: ClubEvent) => {
		const entered =
			formArea.current?.querySelector<HTMLInputElement>("input[name=startDate]")?.value ?? ""
		setCopy({ source, defaults: copiedSettings(source, season, entered) })
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
				{copy ? (
					<p>
						Copied from <span className="font-medium">{copy.source.name}</span> (
						{formatDate(copy.source.startDate)}). Creating the event also copies its{" "}
						{plural(copy.source.courses?.length ?? 0, "course")},{" "}
						{plural(copy.source.eventFees?.length ?? 0, "fee")}, and{" "}
						{plural(copy.source.sessions?.length ?? 0, "session")}.{" "}
						{copy.defaults.startDate
							? `Signup dates were moved to match ${formatDate(copy.defaults.startDate)}.`
							: "Enter the event date and signup dates."}
					</p>
				) : (
					<p className="text-muted-foreground">
						Start blank, or copy the setup of an existing event and adjust it. Enter the event date
						first to have the signup dates filled in to match.
					</p>
				)}
				<div className="flex gap-2">
					{copy && (
						<Button variant="ghost" size="sm" onClick={() => setCopy(null)}>
							Start blank
						</Button>
					)}
					<CopyFromEventDialog onCopy={copyFrom} />
				</div>
			</div>
			<div ref={formArea}>
				<EventSettingsForm
					// Remount with the copied settings as the form's starting values.
					key={copy ? `${copy.source.id}:${copy.defaults.startDate}` : "blank"}
					event={copy?.defaults}
					newEventDefaults={{ season }}
					copyFromEventId={copy?.source.id}
					action={createEvent}
					submitLabel="Create event"
					cancelHref={`/events?season=${season}`}
					tags={tags}
				/>
			</div>
		</div>
	)
}
