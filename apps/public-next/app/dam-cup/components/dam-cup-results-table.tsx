"use client"

import { useState } from "react"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { DamCupResult } from "@/lib/types"

interface DamCupResultsTableProps {
	results: DamCupResult[]
	initialCount?: number
}

export function DamCupResultsTable({ results, initialCount }: DamCupResultsTableProps) {
	const sorted = [...results].sort((a, b) => b.season - a.season)
	const [expanded, setExpanded] = useState(false)
	const canExpand = initialCount !== undefined && sorted.length > initialCount
	const visible = canExpand && !expanded ? sorted.slice(0, initialCount) : sorted

	return (
		<div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead></TableHead>
						<TableHead className="text-center text-primary">Bunker Hills</TableHead>
						<TableHead className="text-center text-secondary">Edinburgh</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{visible.map((r) => {
						const ours = parseFloat(r.good_guys)
						const theirs = parseFloat(r.bad_guys)
						return (
							<TableRow key={r.season}>
								<TableCell title={`Played at ${r.site}`}>{r.season}</TableCell>
								<TableCell className="text-center">
									<span className={ours > theirs ? "font-bold" : ""}>{r.good_guys}</span>
								</TableCell>
								<TableCell className="text-center">
									<span className={theirs > ours ? "font-bold" : ""}>{r.bad_guys}</span>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
			{canExpand && (
				<button
					onClick={() => setExpanded(!expanded)}
					className="mt-2 text-sm text-primary hover:underline"
				>
					{expanded ? "Show less" : `More... (${sorted.length - initialCount})`}
				</button>
			)}
		</div>
	)
}
