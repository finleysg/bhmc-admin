"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { useRegistration } from "@/lib/registration/registration-context"

import { PlayerPicker } from "../../components/player-picker"
import { RegisteredPlayerSelector } from "../components/registered-player-selector"

export default function ManageReplacePage() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { clubEvent } = useRegistration()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(clubEvent?.id, player?.id)

	const registration = registrationData?.registration

	const [sourcePlayerId, setSourcePlayerId] = useState<number | null>(null)
	const [targetPlayerId, setTargetPlayerId] = useState<number | null>(null)
	const [targetPlayerName, setTargetPlayerName] = useState<string>("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	if (!clubEvent || !registration) return null

	const eventUrl = getEventUrl(clubEvent)
	const manageUrl = `${eventUrl}/manage`

	// All players currently registered in any slot for this event
	const registeredPlayerIds = registration.slots
		.filter((s) => s.player !== null)
		.map((s) => s.player!.id)

	const handleSourceChange = (playerIds: number[]) => {
		setSourcePlayerId(playerIds[0] ?? null)
	}

	const handleTargetSelect = (playerId: number, playerName: string) => {
		setTargetPlayerId(playerId)
		setTargetPlayerName(playerName)
	}

	const handleReplace = async () => {
		if (!sourcePlayerId || !targetPlayerId) return

		const slot = registration.slots.find((s) => s.player?.id === sourcePlayerId)
		if (!slot) return

		const sourcePlayerName = slot.player
			? `${slot.player.firstName} ${slot.player.lastName}`
			: "Unknown"

		setIsSubmitting(true)
		try {
			const response = await fetch(`/api/events/${clubEvent.id}/replace-player`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					slotId: slot.id,
					originalPlayerId: sourcePlayerId,
					replacementPlayerId: targetPlayerId,
				}),
			})
			if (!response.ok) {
				throw new Error("Failed to replace player")
			}

			await queryClient.invalidateQueries({
				queryKey: ["player-registration", clubEvent.id, player?.id],
			})

			toast.success(`${sourcePlayerName} replaced by ${targetPlayerName}`)
			router.push(manageUrl)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to replace player")
			setIsSubmitting(false)
		}
	}

	const canReplace = sourcePlayerId !== null && targetPlayerId !== null

	return (
		<div className="mx-auto max-w-[560px]">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Replace Player</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						<div className="space-y-2">
							<Label className="font-semibold">Player to replace</Label>
							<RegisteredPlayerSelector
								registration={registration}
								limit={1}
								onChange={handleSourceChange}
							/>
						</div>
						<div className="space-y-2">
							<Label className="font-semibold">Replacement player</Label>
							<PlayerPicker
								eventId={clubEvent.id}
								onSelect={handleTargetSelect}
								excludeIds={registeredPlayerIds}
							/>
							{targetPlayerName && (
								<p className="text-sm text-muted-foreground">
									Selected: {targetPlayerName}
								</p>
							)}
						</div>
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
							onClick={() => void handleReplace()}
							disabled={!canReplace || isSubmitting}
						>
							{isSubmitting ? "Replacing..." : "Replace"}
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
