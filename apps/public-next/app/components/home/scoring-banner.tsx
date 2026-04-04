"use client"

import { useEffect, useState } from "react"
import { format, isToday, isTomorrow, parse } from "date-fns"

import { useMyPlayer } from "@/lib/hooks/use-my-player"
import type { ClubEvent } from "@/lib/types"

interface EventPairing {
	round_number: number
	round_date: string
	course_name: string
	hole_number: number
	tee_time: string
	group_ggid: string
}

interface ScoringBannerProps {
	events: ClubEvent[]
}

function getActiveEvents(events: ClubEvent[]): ClubEvent[] {
	return events.filter((e) => {
		if ("MNOPW".indexOf(e.event_type) < 0) return false
		if (e.status === "C") return false
		const startDate = parse(e.start_date, "yyyy-MM-dd", new Date())
		return isToday(startDate) || isTomorrow(startDate)
	})
}

function isActiveRound(roundDate: string): boolean {
	const d = parse(roundDate, "yyyy-MM-dd", new Date())
	return isToday(d) || isTomorrow(d)
}

function formatTeeTime(teeTime: string): string {
	// tee_time comes as "HH:MM AM/PM" or similar from GG
	// Return as-is since it's already formatted
	return teeTime
}

function roundLabel(roundDate: string): string {
	const d = parse(roundDate, "yyyy-MM-dd", new Date())
	if (isToday(d)) return "Today"
	return format(d, "EEEE")
}

export function ScoringBanner({ events }: ScoringBannerProps) {
	const { data: player } = useMyPlayer()
	const [pairings, setPairings] = useState<Map<number, EventPairing[]>>(new Map())
	const [loaded, setLoaded] = useState(false)

	const activeEvents = getActiveEvents(events)

	useEffect(() => {
		if (!player || activeEvents.length === 0) {
			setLoaded(true)
			return
		}

		let cancelled = false

		async function fetchPairings() {
			const results = new Map<number, EventPairing[]>()

			await Promise.all(
				activeEvents.map(async (evt) => {
					try {
						const res = await fetch(`/api/events/${evt.id}/pairings?player_id=${player!.id}`)
						if (!res.ok) return
						const data = (await res.json()) as EventPairing[]
						const active = data.filter((p) => isActiveRound(p.round_date))
						if (active.length > 0) {
							results.set(evt.id, active)
						}
					} catch {
						// Silently ignore — banner is non-critical
					}
				}),
			)

			if (!cancelled) {
				setPairings(results)
				setLoaded(true)
			}
		}

		void fetchPairings()

		return () => {
			cancelled = true
		}
	}, [player?.id, activeEvents.map((e) => e.id).join(",")])

	if (!loaded || pairings.size === 0) return null

	return (
		<div className="mb-6 flex flex-col gap-3 lg:hidden">
			{activeEvents.map((evt) => {
				const evtPairings = pairings.get(evt.id)
				if (!evtPairings) return null

				return evtPairings.map((pairing) => (
					<a
						key={`${evt.id}-${pairing.round_number}`}
						href={`https://www.golfgenius.com/deeplink_ggid?ggid=${pairing.group_ggid}`}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
					>
						<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">
							&#9971;
						</span>
						<div className="flex-1">
							<p className="font-semibold">
								{evt.name}
								{evtPairings.length > 1 && ` — Round ${pairing.round_number}`}
							</p>
							<p className="text-sm text-muted-foreground">
								{roundLabel(pairing.round_date)} &middot; {formatTeeTime(pairing.tee_time)} &middot;
								Hole {pairing.hole_number}
							</p>
						</div>
						<span className="text-sm font-medium text-primary">Open Scoring &rarr;</span>
					</a>
				))
			})}
		</div>
	)
}
