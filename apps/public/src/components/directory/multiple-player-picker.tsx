import { useState, useRef } from "react"
import { Typeahead, TypeaheadRef } from "react-bootstrap-typeahead"
import { MdClose } from "react-icons/md"
import { toast } from "react-toastify"
import type { Player } from "../../models/player"

interface MultiplePlayerPickerProps {
	selectedPlayers: Player[]
	onChange: (players: Player[]) => void
	players: Player[]
	isLoading?: boolean
	excludeIds?: number[]
	membersOnly?: boolean
	placeholder?: string
	minChars?: number
	limit?: number
	id?: string
	typeaheadRef?: React.RefObject<TypeaheadRef | null>
}

export function MultiplePlayerPicker({
	selectedPlayers,
	onChange,
	players,
	isLoading = false,
	excludeIds = [],
	membersOnly = false,
	placeholder = "Search for players...",
	minChars = 3,
	limit,
	id = "multiple-player-picker",
	typeaheadRef: externalRef,
}: MultiplePlayerPickerProps) {
	const internalRef = useRef<TypeaheadRef | null>(null)
	const typeaheadRef = externalRef ?? internalRef
	const [searchText, setSearchText] = useState("")

	const options = players.filter(
		(player) =>
			(!membersOnly || player.isMember) &&
			!selectedPlayers.some((sel) => sel.id === player.id) &&
			!excludeIds.includes(player.id) &&
			(player.name.toLowerCase().includes(searchText.toLowerCase()) ||
				player.firstName.toLowerCase().includes(searchText.toLowerCase()) ||
				player.lastName.toLowerCase().includes(searchText.toLowerCase()) ||
				(player.email?.toLowerCase() ?? "").includes(searchText.toLowerCase())),
	)

	const handleSelect = (selected: Player[]) => {
		if (limit !== undefined && selectedPlayers.length >= limit) {
			toast.warning("No more space available.")
			typeaheadRef.current?.clear()
			setSearchText("")
			return
		}
		const newPlayers = selected.filter((player) => !selectedPlayers.some((p) => p.id === player.id))
		onChange([...selectedPlayers, ...newPlayers])
		typeaheadRef.current?.clear()
		setSearchText("")
	}

	const handleRemove = (player: Player) => {
		onChange(selectedPlayers.filter((p) => p.id !== player.id))
	}

	return (
		<>
			<Typeahead
				id={id}
				ref={typeaheadRef}
				isLoading={isLoading}
				labelKey={(option) =>
					typeof option === "object" &&
					option !== null &&
					"firstName" in option &&
					"lastName" in option &&
					"email" in option
						? `${option.firstName} ${option.lastName} (${option.email})`
						: String(option)
				}
				minLength={minChars}
				options={options}
				placeholder={placeholder}
				onChange={(selected) => handleSelect(selected as Player[])}
				multiple={false}
				renderMenuItemChildren={(option) =>
					typeof option === "object" &&
					option !== null &&
					"firstName" in option &&
					"lastName" in option &&
					"email" in option ? (
						<div>
							<div className="text-primary-emphasis">
								{option.firstName} {option.lastName}
							</div>
							<div className="text-muted small">{option.email}</div>
						</div>
					) : (
						<span>{String(option)}</span>
					)
				}
				onInputChange={setSearchText}
			/>
			{selectedPlayers.length > 0 && (
				<div className="mt-3 d-flex flex-wrap gap-2">
					{selectedPlayers.map((player) => (
						<span
							key={player.id}
							className="badge bg-warning text-primary-emphasis d-flex align-items-center me-2"
						>
							<span>
								{player.firstName} {player.lastName}
							</span>
							<button
								type="button"
								className="btn btn-link btn-sm p-0 ms-2"
								onClick={() => handleRemove(player)}
								aria-label={`Remove ${player.firstName} ${player.lastName}`}
								style={{ lineHeight: 1 }}
							>
								<MdClose size={16} />
							</button>
						</span>
					))}
				</div>
			)}
		</>
	)
}
