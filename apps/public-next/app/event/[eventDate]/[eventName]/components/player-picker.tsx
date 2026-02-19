"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import { RegistrationType } from "@/lib/event-utils"
import type { FeePlayer } from "@/lib/registration/fee-utils"
import { useRegistration } from "@/lib/registration/registration-context"

interface SearchResult {
	id: number
	first_name: string
	last_name: string
	email: string | null
	birth_date: string | null
	is_member: boolean
	last_season: number | null
}

interface PlayerPickerProps {
	eventId: number
	onSelect: (playerId: number, playerName: string, player: FeePlayer) => void
	excludeIds?: number[]
}

export function PlayerPicker({ eventId, onSelect, excludeIds = [] }: PlayerPickerProps) {
	const { clubEvent } = useRegistration()
	const [query, setQuery] = useState("")
	const [results, setResults] = useState<SearchResult[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

	const doSearch = useCallback(
		async (pattern: string) => {
			if (pattern.length < 3) {
				setResults([])
				return
			}
			setIsSearching(true)
			try {
				const params = new URLSearchParams({
					pattern,
					event_id: String(eventId),
				})
				const response = await fetch(`/api/players/search?${params.toString()}`)
				if (!response.ok) throw new Error("Search failed")
				const data = (await response.json()) as SearchResult[]
				setResults(data.filter((p) => !excludeIds.includes(p.id)))
			} catch {
				setResults([])
			} finally {
				setIsSearching(false)
			}
		},
		[eventId, excludeIds],
	)

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		if (query.length < 3) {
			setResults([])
			return
		}
		debounceRef.current = setTimeout(() => {
			void doSearch(query)
		}, 300)
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [query, doSearch])

	const handleSelect = (player: SearchResult) => {
		if (clubEvent?.registration_type === RegistrationType.MembersOnly && !player.is_member) {
			toast.error(`Not eligible! ${player.first_name} ${player.last_name} is not a member.`)
			return
		}
		const playerName = `${player.first_name} ${player.last_name}`
		const feePlayer: FeePlayer = {
			birthDate: player.birth_date,
			isMember: player.is_member,
			lastSeason: player.last_season,
		}
		onSelect(player.id, playerName, feePlayer)
		setQuery("")
		setResults([])
	}

	return (
		<Command shouldFilter={false} className="rounded-md border">
			<CommandInput placeholder="Search for player..." value={query} onValueChange={setQuery} />
			<CommandList>
				{query.length >= 3 && results.length === 0 && !isSearching && (
					<CommandEmpty>No players found.</CommandEmpty>
				)}
				{query.length >= 3 && isSearching && <CommandEmpty>Searching...</CommandEmpty>}
				{results.length > 0 && (
					<CommandGroup>
						{results.map((player) => (
							<CommandItem
								key={player.id}
								value={String(player.id)}
								onSelect={() => handleSelect(player)}
							>
								<div className="flex flex-col">
									<span>
										{player.first_name} {player.last_name}
									</span>
									{player.email && (
										<span className="text-xs text-muted-foreground">{player.email}</span>
									)}
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				)}
			</CommandList>
		</Command>
	)
}
