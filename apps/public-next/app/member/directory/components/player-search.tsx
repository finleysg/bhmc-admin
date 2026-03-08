"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { PlayerSummary } from "@/lib/types"

export function PlayerSearch() {
	const [query, setQuery] = useState("")
	const [results, setResults] = useState<PlayerSummary[]>([])
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		if (query.length < 3) {
			setResults([])
			return
		}

		const timer = setTimeout(() => {
			setIsLoading(true)
			fetch(`/api/players/search?pattern=${encodeURIComponent(query)}`)
				.then((response) => {
					if (response.ok) {
						return response.json() as Promise<PlayerSummary[]>
					}
					return []
				})
				.then((data) => setResults(data))
				.catch(() => setResults([]))
				.finally(() => setIsLoading(false))
		}, 500)

		return () => clearTimeout(timer)
	}, [query])

	return (
		<div className="space-y-4">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by name (3+ characters)..."
					className="pl-9"
				/>
			</div>

			{isLoading && (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			)}

			{!isLoading && query.length >= 3 && results.length === 0 && (
				<p className="text-sm text-muted-foreground">No players found</p>
			)}

			{results.length > 0 && (
				<div className="divide-y rounded-md border">
					{results.map((player) => (
						<Link
							key={player.id}
							href={`/member/directory/${player.id}`}
							className="flex items-center justify-between p-3 transition-colors hover:bg-accent"
						>
							<div>
								<p className="text-sm font-medium">
									{player.first_name} {player.last_name}
								</p>
								{player.email && <p className="text-xs text-muted-foreground">{player.email}</p>}
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
