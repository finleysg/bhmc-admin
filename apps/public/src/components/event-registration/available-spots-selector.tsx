import { AvailableGroup } from "../../models/available-group"
import { ClubEvent } from "../../models/club-event"
import { GetGroupStartName } from "../../models/reserve"
import { useAvailableGroups } from "../../hooks/use-available-groups"

interface AvailableSpotsSelectorProps {
	eventId: number
	courseId: number
	playerCount: number
	clubEvent: ClubEvent
	value?: AvailableGroup
	onChange: (group: AvailableGroup | undefined) => void
}

export function AvailableSpotsSelector({
	eventId,
	courseId,
	playerCount,
	clubEvent,
	value,
	onChange,
}: AvailableSpotsSelectorProps) {
	const { data: groups, isLoading } = useAvailableGroups(eventId, courseId, playerCount)

	const getGroupKey = (group: AvailableGroup) => `${group.hole_number}-${group.starting_order}`

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedKey = e.target.value
		if (!selectedKey) {
			onChange(undefined)
			return
		}
		const selectedGroup = groups?.find((g) => getGroupKey(g) === selectedKey)
		onChange(selectedGroup)
	}

	return (
		<div className="form-group mb-2">
			<label htmlFor="available-spots-selector">Starting Spot</label>
			<select
				id="available-spots-selector"
				className="form-control"
				value={value ? getGroupKey(value) : ""}
				onChange={handleChange}
				disabled={isLoading}
			>
				<option value="">-- Select --</option>
				{groups?.map((group) => (
					<option key={getGroupKey(group)} value={getGroupKey(group)}>
						{GetGroupStartName(clubEvent, group.hole_number, group.starting_order)}
					</option>
				))}
			</select>
		</div>
	)
}
