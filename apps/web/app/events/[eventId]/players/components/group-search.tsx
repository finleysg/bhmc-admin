// "use client"

import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from "@headlessui/react"
import { useDebounceValue } from "usehooks-ts"
import { useEffect, useState } from "react"
import type { ValidatedRegistration, ValidatedClubEvent } from "@repo/domain/types"

import { getStart } from "@repo/domain/functions"

interface GroupSearchProps {
	clubEvent: ValidatedClubEvent
	minChars?: number
	initialGroup?: ValidatedRegistration
	onGroupSelected: (group: ValidatedRegistration) => void
	onError?: (error: unknown) => void
}

export function GroupSearch({
	clubEvent,
	minChars = 3,
	initialGroup,
	onGroupSelected,
	onError,
}: GroupSearchProps) {
	const [selectedGroup, setSelectedGroup] = useState<ValidatedRegistration | undefined>(
		initialGroup,
	)
	const [searchText, setSearchText] = useState("")
	const [searchResults, setSearchResults] = useState<ValidatedRegistration[]>([])
	const [loading, setLoading] = useState(false)
	const [debouncedSearchText] = useDebounceValue(searchText, 300)

	useEffect(() => {
		const fetchGroups = async () => {
			if (debouncedSearchText.length < minChars) {
				setSearchResults([])
				return
			}
			setLoading(true)
			try {
				const params = new URLSearchParams({
					searchText: debouncedSearchText,
				})
				const response = await fetch(`/api/registration/${clubEvent.id}/groups/search?${params}`)
				if (response.ok) {
					const groups = (await response.json()) as ValidatedRegistration[]
					setSearchResults(groups)
				} else {
					setSearchResults([])
				}
			} catch (error) {
				onError?.(error)
				setSearchResults([])
			} finally {
				setLoading(false)
			}
		}
		void fetchGroups()
	}, [debouncedSearchText, minChars, clubEvent.id, onError])

	const handleGroupSelect = (group: ValidatedRegistration | null) => {
		if (!group) return
		setSelectedGroup(group)
		setSearchText("")
		setSearchResults([])
		onGroupSelected(group)
	}

	// Helper to render start info
	function renderStartInfo(group: ValidatedRegistration) {
		if (!clubEvent.canChoose) {
			return null
		}

		// A can-choose event is guaranteed to have course data
		const slot = group.slots[0]
		const holes = clubEvent.courses.filter((c) => c.id === group.courseId)[0]?.holes || []

		return getStart(clubEvent, slot, holes)
	}

	return (
		<div className="w-full">
			<Combobox value={selectedGroup ?? null} onChange={handleGroupSelect}>
				<div className="relative">
					<ComboboxInput
						className="input input-bordered w-full"
						placeholder="Search for groups by player name..."
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
						{searchResults.map((group) => (
							<ComboboxOption
								key={group.id}
								value={group}
								className="cursor-pointer select-none px-4 py-2 hover:bg-base-200 data-focus:bg-base-200"
							>
								<div>
									<div className="font-medium">{renderStartInfo(group)}</div>
									<div className="text-sm text-base-content/70">
										{group.slots?.map((slot, idx) =>
											slot.player ? (
												<span key={slot.player.id ?? idx}>
													{slot.player.firstName} {slot.player.lastName}
													{idx < group.slots.length - 1 ? ", " : ""}
												</span>
											) : null,
										)}
									</div>
								</div>
							</ComboboxOption>
						))}
					</ComboboxOptions>
				)}
			</Combobox>
			{/* Selected Group Info */}
			{selectedGroup && (
				<div className="mt-2 card card-bordered bg-base-100 p-4">
					<div className="font-bold">{renderStartInfo(selectedGroup)}</div>
					<div className="text-sm text-base-content/70">
						{selectedGroup.slots?.map((slot, idx) =>
							slot.player ? (
								<span key={slot.player.id ?? idx}>
									{slot.player.firstName} {slot.player.lastName}
									{idx < selectedGroup.slots.length - 1 ? ", " : ""}
								</span>
							) : null,
						)}
					</div>
				</div>
			)}
		</div>
	)
}
