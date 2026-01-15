import { useCallback, useEffect, useState } from "react"

import { useNavigate } from "react-router-dom"

import { ReserveGrid } from "../../components/reserve/reserve-grid"
import { IndexTab } from "../../components/tab/index-tab"
import { Tabs } from "../../components/tab/tabs"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { useEventRegistrationSlots } from "../../hooks/use-event-registration-slots"
import { Course } from "../../models/course"
import { LoadReserveTables, ReserveSlot, ReserveTable } from "../../models/reserve"
import { useCurrentEvent } from "./event-detail"

export function ReserveScreen() {
	const [selectedTableIndex, updateSelectedTableIndex] = useState(0)
	const [reserveTables, setReserveTables] = useState<ReserveTable[]>([])

	const navigate = useNavigate()

	const { clubEvent } = useCurrentEvent()
	const { data: slots } = useEventRegistrationSlots(clubEvent.id)
	const { createRegistration, sseCurrentWave } = useEventRegistration()

	const loadTables = useCallback(() => {
		const tables = LoadReserveTables(clubEvent, slots ?? [])
		setReserveTables(tables)
	}, [clubEvent, slots])

	useEffect(() => {
		const currentTime = new Date()
		if (!clubEvent.paymentsAreOpen(currentTime)) {
			navigate("../")
		}
	}, [clubEvent, navigate])

	useEffect(() => {
		if (reserveTables.length === 0) {
			loadTables()
		}
	}, [reserveTables.length, loadTables])

	const handleReserve = async (course: Course, groupName: string, slots: ReserveSlot[]) => {
		const selectedSlots = slots.map((slot) => slot.toRegistrationSlot())
		const registrationSlots = selectedSlots.filter((slot) => !slot.playerId)
		await createRegistration(
			course,
			registrationSlots,
			`${clubEvent.name}: ${course.name} ${groupName}`,
		)
		navigate("../register", { replace: true })
	}

	const currentWave = sseCurrentWave ?? clubEvent.getCurrentWave()

	return (
		<div className="row">
			<div className="col-12">
				<div>
					<Tabs>
						{reserveTables.map((table, index) => {
							return (
								<IndexTab
									key={table.course.id}
									index={index}
									selectedIndex={selectedTableIndex}
									onSelect={(i: number) => updateSelectedTableIndex(i)}
								>
									{table.course.name}
								</IndexTab>
							)
						})}
						<li className="flex-grow-1">&nbsp;</li>
						<li>
							<button onClick={() => navigate(-1)} className="btn btn-sm btn-secondary me-2">
								Back
							</button>
						</li>
						<li>
							<button onClick={loadTables} className="btn btn-sm btn-primary">
								Refresh
							</button>
						</li>
					</Tabs>
					{reserveTables.length > 0 && (
						<ReserveGrid
							table={reserveTables[selectedTableIndex]}
							clubEvent={clubEvent}
							mode="edit"
							wave={currentWave}
							onReserve={handleReserve}
						/>
					)}
				</div>
			</div>
		</div>
	)
}
