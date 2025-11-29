"use client"

import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from "@headlessui/react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { useDebounceValue } from "usehooks-ts"
import { useEffect, useState } from "react"

import type { Player } from "@repo/domain/types"

interface PlayerSearchProps {
	membersOnly?: boolean
	minChars?: number
	initialSelectedPlayers?: Player[]
	onPlayerSelected: (player: Player) => void
	onPlayerRemoved: (player: Player) => void
	onError?: (error: unknown) => void
}

export function PlayerSearch({
	membersOnly = true,
	minChars = 3,
	initialSelectedPlayers = [],
	onPlayerSelected,
	onPlayerRemoved,
	onError,
}: PlayerSearchProps) {
	const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(initialSelectedPlayers)
	const [searchText, setSearchText] = useState("")
	const [searchResults, setSearchResults] = useState<Player[]>([])
	const [loading, setLoading] = useState(false)
	const [debouncedSearchText] = useDebounceValue(searchText, 300)

	useEffect(() => {
		const fetchPlayers = async () => {
			if (debouncedSearchText.length < minChars) {
				setSearchResults([])
				return
			}

			setLoading(true)
			try {
				const params = new URLSearchParams({
					searchText: debouncedSearchText,
					isMember: membersOnly.toString(),
				})
				const response = await fetch(`/api/registration/players?${params}`)
				if (response.ok) {
					const players = (await response.json()) as Player[]
					setSearchResults(players)
				} else {
					setSearchResults([])
				}
			} catch (error) {
				if (onError) {
					onError(error)
				}
				setSearchResults([])
			} finally {
				setLoading(false)
			}
		}

		void fetchPlayers()
	}, [debouncedSearchText, minChars, membersOnly])

	const handlePlayerSelect = (player: Player | null) => {
		if (!player) return

		// Check if player is already selected (using email as fallback if id is undefined)
		const isAlreadySelected = selectedPlayers.some(
			(p) =>
				(p.id && player.id && p.id === player.id) ||
				(!p.id && !player.id && p.email === player.email),
		)
		if (isAlreadySelected) {
			return
		}

		const newSelectedPlayers = [...selectedPlayers, player]
		setSelectedPlayers(newSelectedPlayers)
		setSearchText("") // Clear the input
		setSearchResults([]) // Clear results
		onPlayerSelected(player)
	}

	const handlePlayerRemove = (player: Player) => {
		const newSelectedPlayers = selectedPlayers.filter(
			(p) =>
				!(p.id && player.id && p.id === player.id) &&
				!(!p.id && !player.id && p.email === player.email),
		)
		setSelectedPlayers(newSelectedPlayers)
		onPlayerRemoved(player)
	}

	return (
		<div className="w-full">
			<Combobox value={null} onChange={handlePlayerSelect}>
				<div className="relative">
					<ComboboxInput
						className="input input-bordered w-full"
						placeholder="Search for players..."
						value={searchText}
						onChange={(event) => setSearchText(event.target.value)}
					/>
					{loading && (
						<span className="absolute right-3 top-1/2 transform -translate-y-1/2">
							<span className="loading loading-spinner loading-sm"></span>
						</span>
					)}
				</div>

				{searchResults.length > 0 && (
					<ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-base-100 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
						{searchResults.map((player) => (
							<ComboboxOption
								key={player.id || `${player.firstName}-${player.lastName}`}
								value={player}
								className="cursor-pointer select-none px-4 py-2 hover:bg-base-200 data-focus:bg-base-200"
							>
								<div className="flex items-center">
									<div>
										<div className="font-medium">
											{player.firstName} {player.lastName}
										</div>
										<div className="text-sm text-base-content/70">
											{player.email}
											{player.ghin && ` • GHIN: ${player.ghin}`}
											{!player.isMember && " • Non-member"}
										</div>
									</div>
								</div>
							</ComboboxOption>
						))}
					</ComboboxOptions>
				)}
			</Combobox>

			{/* Selected Players as Badges */}
			{selectedPlayers.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-2">
					{selectedPlayers.map((player) => (
						<div
							key={player.id || `${player.firstName}-${player.lastName}`}
							className="badge badge-info gap-2"
						>
							<span>
								{player.firstName} {player.lastName}
							</span>
							<button
								type="button"
								className="btn btn-ghost btn-xs btn-circle"
								onClick={() => handlePlayerRemove(player)}
								aria-label={`Remove ${player.firstName} ${player.lastName}`}
							>
								<XMarkIcon className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
