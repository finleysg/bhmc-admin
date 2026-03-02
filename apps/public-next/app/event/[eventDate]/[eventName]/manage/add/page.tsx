"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { useOpenSlots } from "@/lib/hooks/use-open-slots"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { useRegistrationSlots } from "@/lib/hooks/use-registration-slots"
import { useRegistration } from "@/lib/registration/registration-context"

import { PlayerPicker } from "../../components/player-picker"

interface SelectedPlayer {
	id: number
	name: string
}

export default function ManageAddPage() {
	const router = useRouter()
	const { clubEvent, editRegistration, initiateStripeSession } = useRegistration()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(clubEvent?.id, player?.id)
	const { data: allSlots = [] } = useRegistrationSlots(clubEvent?.id)

	const registration = registrationData?.registration

	const { data: openSlots = [] } = useOpenSlots(
		clubEvent?.id ?? 0,
		registration?.slots[0]?.holeId ?? 0,
		registration?.slots[0]?.startingOrder ?? 0,
	)

	const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	if (!clubEvent || !registration) return null

	const eventUrl = getEventUrl(clubEvent)
	const manageUrl = `${eventUrl}/manage`

	const availableSlots = clubEvent.can_choose
		? openSlots.length
		: (clubEvent.maximum_signup_group_size ?? 0) -
			registration.slots.filter((s) => s.player !== null).length

	const registeredPlayerIds = allSlots
		.filter((s) => s.player !== null)
		.map((s) => s.player!.id)

	const excludeIds = [...registeredPlayerIds, ...selectedPlayers.map((p) => p.id)]

	const handleSelect = (playerId: number, playerName: string) => {
		if (selectedPlayers.length >= availableSlots) {
			toast.error("No more available slots")
			return
		}
		setSelectedPlayers((prev) => [...prev, { id: playerId, name: playerName }])
	}

	const handleRemove = (playerId: number) => {
		setSelectedPlayers((prev) => prev.filter((p) => p.id !== playerId))
	}

	const handleContinue = async () => {
		if (selectedPlayers.length === 0 || !registration) return

		setIsSubmitting(true)
		try {
			await editRegistration(
				registration.id,
				selectedPlayers.map((p) => p.id),
			)
			initiateStripeSession()
			router.push(`${eventUrl}/register`)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to add players")
			setIsSubmitting(false)
		}
	}

	if (availableSlots <= 0) {
		return (
			<div className="mx-auto max-w-[560px]">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Add Players</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							No available slots to add players.
						</p>
					</CardContent>
					<CardFooter className="flex-col items-stretch gap-4">
						<Separator />
						<div className="flex justify-end">
							<Button variant="ghost" onClick={() => router.push(manageUrl)}>
								Back
							</Button>
						</div>
					</CardFooter>
				</Card>
			</div>
		)
	}

	const canContinue = selectedPlayers.length > 0

	return (
		<div className="mx-auto max-w-[560px]">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Add Players</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="font-semibold">
								Search for players to add ({availableSlots - selectedPlayers.length}{" "}
								slot{availableSlots - selectedPlayers.length !== 1 ? "s" : ""}{" "}
								available)
							</Label>
							<PlayerPicker
								eventId={clubEvent.id}
								onSelect={handleSelect}
								excludeIds={excludeIds}
							/>
						</div>
						{selectedPlayers.length > 0 && (
							<div className="space-y-2">
								<Label className="font-semibold">Selected players</Label>
								<ul className="space-y-1">
									{selectedPlayers.map((p) => (
										<li
											key={p.id}
											className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
										>
											<span>{p.name}</span>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleRemove(p.id)}
												disabled={isSubmitting}
											>
												Remove
											</Button>
										</li>
									))}
								</ul>
							</div>
						)}
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
							onClick={() => void handleContinue()}
							disabled={!canContinue || isSubmitting}
						>
							{isSubmitting ? "Adding..." : "Continue"}
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
