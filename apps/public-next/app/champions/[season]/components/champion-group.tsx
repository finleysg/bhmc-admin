"use client"

import { ChevronDown, Trophy } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { PlayerLink } from "@/components/player-link"
import { dayAndDateFormat, parseApiDate } from "@/lib/date-utils"
import type { MajorChampion, PlayerSummary } from "@/lib/types"

interface ChampionRow {
	rowKey: string
	eventName: string
	flight: string
	score: number
	isNet: boolean
	players: PlayerSummary[]
}

interface ChampionGroupProps {
	eventName: string
	eventStartDate: string | null
	champions: MajorChampion[]
	isOpen: boolean
	onToggle: (open: boolean) => void
}

export function ChampionGroup({
	eventName,
	eventStartDate,
	champions,
	isOpen,
	onToggle,
}: ChampionGroupProps) {
	const rows: ChampionRow[] = []

	for (const c of champions) {
		const teamKey = c.team_id ?? String(c.player.id)
		const rowKey = `${c.event_name}-${teamKey}`
		const existing = rows.find((r) => r.rowKey === rowKey)
		if (existing) {
			existing.players.push(c.player)
		} else {
			rows.push({
				rowKey,
				eventName: c.event_name,
				flight: c.flight,
				score: c.score,
				isNet: c.is_net,
				players: [c.player],
			})
		}
	}

	const formattedDate = eventStartDate ? dayAndDateFormat(parseApiDate(eventStartDate)) : null

	return (
		<Collapsible open={isOpen} onOpenChange={onToggle}>
			<Card>
				<CollapsibleTrigger asChild>
					<CardHeader className="cursor-pointer select-none">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-primary">{eventName}</CardTitle>
								{formattedDate && <CardDescription>{formattedDate}</CardDescription>}
							</div>
							<ChevronDown
								className={`size-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
							/>
						</div>
					</CardHeader>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Player(s)</TableHead>
									<TableHead>Event Name</TableHead>
									<TableHead>Flight</TableHead>
									<TableHead>Net/Gross</TableHead>
									<TableHead className="text-right">Score</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row) => (
									<TableRow key={row.rowKey}>
										<TableCell>
											<div className="flex items-center gap-2">
												<Trophy className="size-3.5 shrink-0 text-amber-500" />
												<span>
													{row.players.map((player, i) => (
														<span key={player.id}>
															{i > 0 && ", "}
															<PlayerLink player={player} />
														</span>
													))}
												</span>
											</div>
										</TableCell>
										<TableCell>{row.eventName}</TableCell>
										<TableCell>{row.flight}</TableCell>
										<TableCell>{row.isNet ? "Net" : "Gross"}</TableCell>
										<TableCell className="text-right">{row.score}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	)
}
