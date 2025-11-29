"use client"

import { useCallback, useEffect, useState } from "react"
import { AvailableSlotGroup, ClubEvent, Course } from "@repo/domain/types"
import { getStart } from "@repo/domain/functions"

interface SelectAvailableProps {
	players: number
	courses: Course[]
	clubEvent: ClubEvent
	onSlotSelect: (slotIds: number[], group?: AvailableSlotGroup) => void
	onError?: (error: unknown) => void
}

export function SelectAvailable({
	players,
	courses,
	clubEvent,
	onSlotSelect,
	onError,
}: SelectAvailableProps) {
	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
	const [availableSlotGroups, setAvailableSlotGroups] = useState<AvailableSlotGroup[]>([])
	const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([])
	const [loadingSlots, setLoadingSlots] = useState(false)

	// Fetch available slots when course is selected
	useEffect(() => {
		if (!selectedCourseId) {
			setAvailableSlotGroups([])
			return
		}

		const fetchSlots = async () => {
			setLoadingSlots(true)
			try {
				const response = await fetch(
					`/api/registration/${clubEvent.id}/available-slots?courseId=${selectedCourseId}&players=${players}`,
				)
				if (!response.ok) {
					throw new Error(`Failed to fetch slots: ${response.statusText}`)
				}
				const slotsData = (await response.json()) as AvailableSlotGroup[]
				setAvailableSlotGroups(slotsData)
			} catch (err) {
				if (onError) {
					onError(err)
				}
			} finally {
				setLoadingSlots(false)
			}
		}

		void fetchSlots()
	}, [selectedCourseId, clubEvent.id, players])

	const handleCourseChange = useCallback(
		(courseId: number) => {
			setSelectedCourseId(courseId)
			setSelectedSlotIds([])
			onSlotSelect([])
		},
		[onSlotSelect],
	)

	const handleSlotGroupSelect = useCallback(
		(slotGroup: AvailableSlotGroup) => {
			const slotIds = slotGroup.slots
				.map((slot) => slot.id)
				.filter((id): id is number => id !== undefined)
			setSelectedSlotIds(slotIds)
			onSlotSelect(slotIds, slotGroup)
		},
		[onSlotSelect],
	)

	const handleClearSelection = useCallback(() => {
		setSelectedSlotIds([])
		onSlotSelect([])
	}, [onSlotSelect])

	// Compute selected start name for display
	const selectedStartName =
		selectedSlotIds.length > 0
			? (() => {
					const selectedGroup = availableSlotGroups.find((group) =>
						group.slots.some((slot) => slot.id && selectedSlotIds.includes(slot.id)),
					)
					const selectedCourse = courses.find((c) => c.id === selectedCourseId)
					return selectedGroup && selectedCourse
						? getStart(clubEvent, selectedGroup.slots[0], selectedCourse.holes || [])
						: "Unknown"
				})()
			: ""

	return (
		<div className="w-full">
			{/* Course Selection */}
			<div className="form-control mb-2">
				<label className="label mb-1 me-2">
					<span className="label-text">Course</span>
				</label>
				<select
					className="select select-bordered"
					value={selectedCourseId || ""}
					onChange={(e) => handleCourseChange(Number(e.target.value))}
				>
					<option value="" disabled>
						Choose a course
					</option>
					{courses.map((course) => (
						<option key={course.id} value={course.id}>
							{course.name}
						</option>
					))}
				</select>
			</div>

			{/* Available Slots */}
			{selectedCourseId && (
				<div className="form-control mb-2">
					<label className="label mb-1 me-2">
						<span className="label-text">Starting Time</span>
					</label>
					{loadingSlots ? (
						<div className="loading loading-spinner"></div>
					) : selectedSlotIds.length > 0 ? (
						<div className="flex items-center gap-2">
							<div className="badge badge-info">
								{selectedStartName}
								<button
									type="button"
									className="btn btn-ghost btn-xs ml-2"
									onClick={handleClearSelection}
									aria-label="Clear selection"
								>
									✕
								</button>
							</div>
						</div>
					) : (
						<select
							className="select select-bordered"
							value=""
							onChange={(e) => {
								const value = e.target.value
								if (value) {
									const index = parseInt(value)
									if (availableSlotGroups[index]) {
										handleSlotGroupSelect(availableSlotGroups[index])
									}
								}
							}}
						>
							<option value="" disabled>
								Choose a starting time
							</option>
							{availableSlotGroups.map((slotGroup, index) => {
								const selectedCourse = courses.find((c) => c.id === selectedCourseId)
								const startName = selectedCourse
									? getStart(clubEvent, slotGroup.slots[0], selectedCourse.holes || [])
									: "Unknown"
								return (
									<option key={startName} value={index.toString()}>
										{startName}: {slotGroup.slots.length} slots available
									</option>
								)
							})}
						</select>
					)}
				</div>
			)}
		</div>
	)
}
