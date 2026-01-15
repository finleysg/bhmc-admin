import { useEventAdmin } from "../layout/event-admin"
import { ReserveManager1 } from "../reserve/reserve-manager-1"
import { ReserveManager2 } from "../reserve/reserve-manager-2"

export function ManagePlayersScreen() {
	const { clubEvent } = useEventAdmin()

	return (
		<div>
			{clubEvent.canChoose ? (
				<ReserveManager1 clubEvent={clubEvent} />
			) : (
				<ReserveManager2 clubEvent={clubEvent} />
			)}
		</div>
	)
}
