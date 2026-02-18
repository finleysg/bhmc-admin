"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getEventUrl } from "@/lib/event-utils"
import { useAvailableGroups, type AvailableGroup } from "@/lib/hooks/use-available-groups"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { useMovePlayers } from "@/lib/hooks/use-manage-mutations"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { getGroupStartName } from "@/lib/registration/reserve-utils"
import type { Course } from "@/lib/types"

export default function MoveGroupPage() {
	const router = useRouter()
	const { event, isLoading: eventLoading } = useEventFromParams()
	const { data: player, isLoading: playerLoading } = useMyPlayer()
	const { data: registrationData, isLoading: regLoading } = usePlayerRegistration(
		event?.id,
		player?.id,
	)
	const movePlayers = useMovePlayers(event?.id)

	const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(undefined)
	const [selectedGroup, setSelectedGroup] = useState<AvailableGroup | undefined>(undefined)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const isLoading = eventLoading || playerLoading || regLoading
	const registration = registrationData?.registration
	const playerCount = registration?.slots.filter((s) => s.player).length ?? 0

	const { data: availableGroups = [], isLoading: groupsLoading } = useAvailableGroups(
		event?.id,
		selectedCourseId,
		playerCount,
	)

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	if (!event) {
		return (
			<div className="py-8 text-center">
				<h2 className="text-lg font-semibold">Event not found</h2>
			</div>
		)
	}

	const eventUrl = getEventUrl(event)

	if (!registration) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Move Group</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground">No registration found.</p>
					<div className="flex justify-end">
						<Button variant="secondary" onClick={() => router.push(`${eventUrl}/manage`)}>
							Back
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	const selectedCourse = event.courses.find((c: Course) => c.id === selectedCourseId)

	const handleCourseChange = (value: string) => {
		setSelectedCourseId(Number(value))
		setSelectedGroup(undefined)
	}

	const handleGroupChange = (value: string) => {
		const group = availableGroups.find((g) => `${g.hole_number}-${g.starting_order}` === value)
		setSelectedGroup(group)
	}

	const handleMove = async () => {
		if (!selectedGroup) return

		setIsSubmitting(true)
		try {
			await movePlayers.mutateAsync({
				registrationId: registration.id,
				sourceSlotIds: registration.slots.map((s) => s.id),
				destinationSlotIds: selectedGroup.slots.map((s) => s.id),
			})
			const newLocation = getGroupStartName(
				event,
				selectedGroup.hole_number,
				selectedGroup.starting_order,
			)
			toast.success(`Group moved to ${selectedCourse?.name} ${newLocation}`)
			router.push(`${eventUrl}/manage`)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to move group")
			setIsSubmitting(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Move Group</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label>Select Course</Label>
					<Select
						value={selectedCourseId ? String(selectedCourseId) : undefined}
						onValueChange={handleCourseChange}
					>
						<SelectTrigger>
							<SelectValue placeholder="Choose a course..." />
						</SelectTrigger>
						<SelectContent>
							{event.courses.map((course: Course) => (
								<SelectItem key={course.id} value={String(course.id)}>
									{course.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{selectedCourseId && (
					<div className="space-y-2">
						<Label>Select Starting Spot</Label>
						{groupsLoading ? (
							<Skeleton className="h-10 w-full" />
						) : availableGroups.length === 0 ? (
							<p className="text-sm text-muted-foreground">No available spots for this course.</p>
						) : (
							<Select
								value={
									selectedGroup
										? `${selectedGroup.hole_number}-${selectedGroup.starting_order}`
										: undefined
								}
								onValueChange={handleGroupChange}
							>
								<SelectTrigger>
									<SelectValue placeholder="Choose a spot..." />
								</SelectTrigger>
								<SelectContent>
									{availableGroups.map((group) => {
										const label = getGroupStartName(event, group.hole_number, group.starting_order)
										return (
											<SelectItem
												key={`${group.hole_number}-${group.starting_order}`}
												value={`${group.hole_number}-${group.starting_order}`}
											>
												{selectedCourse?.name} {label}
											</SelectItem>
										)
									})}
								</SelectContent>
							</Select>
						)}
					</div>
				)}

				<div className="flex justify-end gap-2">
					<Button
						variant="secondary"
						onClick={() => router.push(`${eventUrl}/manage`)}
						disabled={isSubmitting}
					>
						Back
					</Button>
					<Button onClick={() => void handleMove()} disabled={!selectedGroup || isSubmitting}>
						{isSubmitting ? "Moving..." : "Move"}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
