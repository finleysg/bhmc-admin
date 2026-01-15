import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { AvailableSpotsSelector } from "../../components/event-registration/available-spots-selector"
import { CourseSelector } from "../../components/course-selector/course-selector"
import { useMovePlayers } from "../../hooks/use-move-players"
import { useManageRegistration } from "./manage-registration"
import type { AvailableGroup } from "../../models/available-group"
import type { Course } from "../../models/course"
import type { RegistrationSlot } from "../../models/registration"
import { GetGroupStartName } from "../../models/reserve"

export function MoveGroupScreen() {
	const { clubEvent, registration: currentRegistration } = useManageRegistration()
	const movePlayers = useMovePlayers()
	const navigate = useNavigate()

	const [selectedCourse, setSelectedCourse] = useState<Course | undefined>(undefined)
	const [selectedGroup, setSelectedGroup] = useState<AvailableGroup | undefined>(undefined)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const playerCount = currentRegistration.slots.filter((s: RegistrationSlot) => s.playerId).length

	const handleCourseChange = (course: Course) => {
		setSelectedCourse(course)
		setSelectedGroup(undefined)
	}

	const handleGroupChange = (group: AvailableGroup | undefined) => {
		setSelectedGroup(group)
	}

	const handleMove = async () => {
		if (!selectedGroup) return

		setIsSubmitting(true)
		try {
			await movePlayers.mutateAsync({
				registrationId: currentRegistration.id,
				sourceSlotIds: currentRegistration.slots.map((s: RegistrationSlot) => s.id),
				destinationSlotIds: selectedGroup.slots.map((s) => s.id),
			})
			const newLocation = GetGroupStartName(
				clubEvent,
				selectedGroup.hole_number,
				selectedGroup.starting_order,
			)
			toast.success(`Group moved to ${selectedCourse?.name} ${newLocation}`)
			navigate("../")
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to move group")
			setIsSubmitting(false)
		}
	}

	const handleBack = () => {
		navigate("..")
	}

	const canMove = selectedGroup !== undefined

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2 text-primary">Move Group</h4>
						<div className="mb-4">
							<div className="form-label fw-semibold">Select Course</div>
							<CourseSelector
								courses={clubEvent.courses}
								selectedCourse={selectedCourse}
								onChange={handleCourseChange}
							/>
						</div>
						{selectedCourse && (
							<div className="mb-4">
								<div className="form-label fw-semibold">Select Starting Spot</div>
								<AvailableSpotsSelector
									eventId={clubEvent.id}
									courseId={selectedCourse.id}
									playerCount={playerCount}
									clubEvent={clubEvent}
									value={selectedGroup}
									onChange={handleGroupChange}
								/>
							</div>
						)}
						<hr />
						<div style={{ textAlign: "right" }}>
							<button
								className="btn btn-secondary me-2"
								onClick={handleBack}
								disabled={isSubmitting}
							>
								Back
							</button>
							<button
								className="btn btn-primary"
								onClick={handleMove}
								disabled={!canMove || isSubmitting}
							>
								Move
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
