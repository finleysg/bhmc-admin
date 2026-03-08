"use client"

import { useState, useEffect } from "react"
import { Search, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { PlayerSummary } from "@/lib/types"

interface FriendSearchProps {
	onAdd: (playerId: number) => void
	existingFriendIds: Set<number>
}

export function FriendSearch({ onAdd, existingFriendIds }: FriendSearchProps) {
	const [showSearch, setShowSearch] = useState(false)
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

	const handleClose = () => {
		setShowSearch(false)
		setQuery("")
		setResults([])
	}

	if (!showSearch) {
		return (
			<Button variant="link" className="mb-3 p-0" onClick={() => setShowSearch(true)}>
				<UserPlus className="mr-1 size-4" />
				Add Friend
			</Button>
		)
	}

	return (
		<div className="mb-4 space-y-3">
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search for player (3+ characters)..."
						className="pl-9"
						autoFocus
					/>
				</div>
				<Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close search">
					<X className="size-4" />
				</Button>
			</div>

			{isLoading && (
				<div className="space-y-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			)}

			{!isLoading && query.length >= 3 && results.length === 0 && (
				<p className="text-sm text-muted-foreground">No players found</p>
			)}

			{results.length > 0 && (
				<div className="divide-y rounded-md border">
					{results.map((player) => (
						<div key={player.id} className="flex items-center justify-between p-3">
							<span className="text-sm">
								{player.first_name} {player.last_name}
							</span>
							{existingFriendIds.has(player.id) ? (
								<span className="text-xs text-muted-foreground">Already a friend</span>
							) : (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										onAdd(player.id)
										setQuery("")
										setResults([])
									}}
								>
									<UserPlus className="mr-1 size-4" />
									Add
								</Button>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
