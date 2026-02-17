"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { getEventUrl } from "@/lib/event-utils"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { useDropPlayers } from "@/lib/hooks/use-manage-mutations"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"

export default function DropPlayersPage() {
	const router = useRouter()
	const { event, isLoading: eventLoading } = useEventFromParams()
	const { data: player, isLoading: playerLoading } = useMyPlayer()
	const { data: registrationData, isLoading: regLoading } = usePlayerRegistration(
		event?.id,
		player?.id,
	)
	const dropPlayers = useDropPlayers()

	const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([])
	const [showConfirm, setShowConfirm] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const isLoading = eventLoading || playerLoading || regLoading

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
	const registration = registrationData?.registration

	if (!registration) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Drop Players</CardTitle>
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

	const filledSlots = registration.slots.filter((s) => s.player)

	const handleToggle = (slotId: number, checked: boolean) => {
		setSelectedSlotIds((prev) => (checked ? [...prev, slotId] : prev.filter((id) => id !== slotId)))
	}

	const handleDrop = async () => {
		setShowConfirm(false)
		if (selectedSlotIds.length === 0) return

		setIsSubmitting(true)
		try {
			await dropPlayers.mutateAsync({
				registrationId: registration.id,
				slotIds: selectedSlotIds,
			})
			toast.success(`${selectedSlotIds.length} player(s) dropped`)

			const remainingPlayers = filledSlots.length - selectedSlotIds.length
			const isDroppingMyself = filledSlots.some(
				(s) => s.player && s.player.id === player?.id && selectedSlotIds.includes(s.id),
			)

			if (remainingPlayers === 0 || isDroppingMyself) {
				router.push(eventUrl)
			} else {
				router.push(`${eventUrl}/manage`)
			}
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to drop players")
			setIsSubmitting(false)
		}
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Drop Players</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm font-medium">Select players to drop</p>
					<div className="space-y-2">
						{filledSlots.map((slot) => (
							<label
								key={slot.id}
								className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
							>
								<Checkbox
									checked={selectedSlotIds.includes(slot.id)}
									onCheckedChange={(checked) => handleToggle(slot.id, checked === true)}
									disabled={isSubmitting}
								/>
								<span className="text-sm">
									{slot.player?.firstName} {slot.player?.lastName}
								</span>
							</label>
						))}
					</div>

					<div className="flex justify-end gap-2">
						<Button
							variant="secondary"
							onClick={() => router.push(`${eventUrl}/manage`)}
							disabled={isSubmitting}
						>
							Back
						</Button>
						<Button
							variant="destructive"
							onClick={() => setShowConfirm(true)}
							disabled={selectedSlotIds.length === 0 || isSubmitting}
						>
							Drop
						</Button>
					</div>
				</CardContent>
			</Card>

			<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Drop Players</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove {selectedSlotIds.length} player(s) from your group? A
							refund will be triggered for fees paid.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={() => void handleDrop()}>
							Confirm Drop
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
