"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { getEventUrl } from "@/lib/event-utils"
import { useAvailableSlotGroups } from "@/lib/hooks/use-available-slot-groups"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { useRegistration } from "@/lib/registration/registration-context"
import { getGroupStartName } from "@/lib/start-name"

export default function ManageMovePage() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { clubEvent } = useRegistration()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(clubEvent?.id, player?.id)

	const registration = registrationData?.registration

	const courses = clubEvent?.courses ?? []
	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
		courses.length === 1 ? courses[0].id : null,
	)

	// Auto-select course when event data loads asynchronously (single-course events)
	useEffect(() => {
		if (selectedCourseId === null && courses.length === 1) {
			setSelectedCourseId(courses[0].id)
		}
	}, [courses, selectedCourseId])
	const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const playerCount = registration?.slots.filter((s) => s.player !== null).length

	const { data: slotGroups } = useAvailableSlotGroups(
		clubEvent?.id,
		selectedCourseId ?? undefined,
		playerCount,
	)

	if (!clubEvent || !registration) return null

	const eventUrl = getEventUrl(clubEvent)
	const manageUrl = `${eventUrl}/manage`

	const selectedGroup = slotGroups?.find(
		(g) => `${g.holeId}-${g.startingOrder}` === selectedGroupKey,
	)

	const handleMove = async () => {
		if (!selectedGroup) return

		setIsSubmitting(true)
		try {
			const sourceSlotIds = registration.slots.map((s) => s.id)

			const response = await fetch(`/api/events/${clubEvent.id}/move-players`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sourceSlotIds,
					destinationStartingHoleId: selectedGroup.holeId,
					destinationStartingOrder: selectedGroup.startingOrder,
				}),
			})

			if (!response.ok) {
				throw new Error("Failed to move group")
			}

			await queryClient.invalidateQueries({
				queryKey: ["player-registration", clubEvent.id, player?.id],
			})

			const newStartName = getGroupStartName(
				clubEvent,
				selectedGroup.holeNumber,
				selectedGroup.startingOrder,
			)
			toast.success(`Group moved to ${newStartName}`)
			router.push(manageUrl)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to move group")
			setIsSubmitting(false)
		}
	}

	const canMove = selectedGroup !== undefined

	return (
		<div className="max-w-[560px]">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Move Group</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{courses.length > 1 && (
							<div className="space-y-2">
								<Label className="font-semibold">Select course</Label>
								<div className="flex gap-2">
									{courses.map((course) => (
										<Button
											key={course.id}
											variant={selectedCourseId === course.id ? "default" : "outline"}
											size="sm"
											onClick={() => {
												setSelectedCourseId(course.id)
												setSelectedGroupKey(null)
											}}
										>
											{course.name}
										</Button>
									))}
								</div>
							</div>
						)}
						{selectedCourseId && (
							<div className="space-y-2">
								<Label className="font-semibold">Select starting spot</Label>
								<Select value={selectedGroupKey ?? ""} onValueChange={setSelectedGroupKey}>
									<SelectTrigger>
										<SelectValue placeholder="Choose a spot..." />
									</SelectTrigger>
									<SelectContent>
										{slotGroups?.map((group) => {
											const key = `${group.holeId}-${group.startingOrder}`
											const label = getGroupStartName(
												clubEvent,
												group.holeNumber,
												group.startingOrder,
											)
											return (
												<SelectItem key={key} value={key}>
													{label}
												</SelectItem>
											)
										})}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex-col items-stretch gap-4">
					<Separator />
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => router.push(manageUrl)} disabled={isSubmitting}>
							Back
						</Button>
						<Button onClick={() => void handleMove()} disabled={!canMove || isSubmitting}>
							Move
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
