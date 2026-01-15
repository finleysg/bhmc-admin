import { ComponentPropsWithoutRef, useRef } from "react"

import { Typeahead, TypeaheadRef } from "react-bootstrap-typeahead"
import { toast } from "react-toastify"

import { usePlayers } from "../../hooks/use-players"
import { ClubEvent } from "../../models/club-event"
import { RegistrationType } from "../../models/codes"
import { Player } from "../../models/player"
import { AddPlayer } from "./add-player"

interface PeopleLookup {
	id: number
	email: string
	label: string
	name: string
}

interface PeoplePickerProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
	allowNew: boolean
	clubEvent?: ClubEvent
	onSelect: (player: Player) => void
}

export function PeoplePicker({ allowNew, clubEvent, onSelect, ...rest }: PeoplePickerProps) {
	const typeaheadRef = useRef<TypeaheadRef>(null)
	const { data } = usePlayers()

	const players =
		data?.map((p) => {
			return {
				id: p.id,
				label: p.name,
				name: p.name,
				email: p.email,
			} as PeopleLookup
		}) ?? []

	const handleSelect = (selected: PeopleLookup) => {
		if (data && selected) {
			const selectedPlayer = data.find((d) => d.id === selected.id)
			if (selectedPlayer) {
				typeaheadRef.current?.clear()
				if (
					clubEvent &&
					clubEvent.registrationType === RegistrationType.MembersOnly &&
					!selectedPlayer.isMember
				) {
					toast.error(`Not eligible! ${selectedPlayer.name} is not a member.`, { autoClose: 5000 })
					return
				}
				onSelect(selectedPlayer)
			}
		}
	}

	return (
		<div {...rest}>
			{(clubEvent?.registrationType === RegistrationType.GuestsAllowed ||
				clubEvent?.registrationType === RegistrationType.Open) && (
				<AddPlayer
					onAdd={(player) => onSelect(player)}
					style={{ display: "inline-block", marginRight: "10px" }}
				/>
			)}
			<div style={{ display: "inline-block" }}>
				<Typeahead
					id="player-search"
					ref={typeaheadRef}
					filterBy={["name", "email"]}
					placeholder="Search for player..."
					minLength={3}
					highlightOnlyResult={!allowNew}
					newSelectionPrefix={"Add new player: "}
					allowNew={allowNew}
					onChange={(selected) => handleSelect(selected[0] as PeopleLookup)}
					options={players}
				/>
			</div>
		</div>
	)
}
