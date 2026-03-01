"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { useRegistration } from "@/lib/registration/registration-context"

import { RegisteredPlayerSelector } from "../components/registered-player-selector"

export default function ManageDropPage() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { clubEvent } = useRegistration()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(clubEvent?.id, player?.id)

	const registration = registrationData?.registration

	const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([])
	const [showConfirm, setShowConfirm] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	if (!clubEvent || !registration) return null

	const eventUrl = getEventUrl(clubEvent)
	const manageUrl = `${eventUrl}/manage`

	const handleDrop = async () => {
		if (selectedPlayerIds.length === 0) return

		const slotIds = registration.slots
			.filter((slot) => slot.player && selectedPlayerIds.includes(slot.player.id))
			.map((slot) => slot.id)

		if (slotIds.length === 0) return

		setIsSubmitting(true)
		try {
			const response = await fetch(`/api/registration/${registration.id}/drop`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source_slots: slotIds }),
			})
			if (!response.ok) {
				throw new Error("Failed to drop players")
			}

			await queryClient.invalidateQueries({
				queryKey: ["player-registration", clubEvent.id, player?.id],
			})

			toast.success(`${slotIds.length} player(s) dropped`)

			const totalPlayers = registration.slots.filter((s) => s.player !== null).length
			const remainingPlayers = totalPlayers - selectedPlayerIds.length
			const isDroppingMyself = player && selectedPlayerIds.includes(player.id)

			if (remainingPlayers === 0 || isDroppingMyself) {
				router.push(eventUrl)
			} else {
				router.push(manageUrl)
			}
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to drop players")
			setIsSubmitting(false)
		}
	}

	const canDrop = selectedPlayerIds.length > 0

	return (
		<div className="mx-auto max-w-[560px]">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Drop Players</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Label className="font-semibold">Select players to drop</Label>
						<RegisteredPlayerSelector
							registration={registration}
							onChange={setSelectedPlayerIds}
						/>
					</div>
				</CardContent>
				<CardFooter className="flex-col items-stretch gap-4">
					<Separator />
					<div className="flex justify-end gap-2">
						<Button
							variant="ghost"
							onClick={() => router.push(manageUrl)}
							disabled={isSubmitting}
						>
							Back
						</Button>
						<Button
							variant="destructive"
							onClick={() => setShowConfirm(true)}
							disabled={!canDrop || isSubmitting}
						>
							Drop
						</Button>
					</div>
				</CardFooter>
			</Card>

			<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Drop Players</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove {selectedPlayerIds.length} player(s) from
							your group?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => void handleDrop()}>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
