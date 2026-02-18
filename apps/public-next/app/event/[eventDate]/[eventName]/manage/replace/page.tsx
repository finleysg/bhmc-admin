"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { getEventUrl } from "@/lib/event-utils"
import { useSwapPlayers } from "@/lib/hooks/use-manage-mutations"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { RegistrationPageWrapper } from "../../components/registration-page-wrapper"
import { PlayerPicker } from "../../components/player-picker"
import type { ClubEventDetail } from "@/lib/types"

export default function ReplacePlayerPage() {
	return (
		<RegistrationPageWrapper>
			{(event) => <ReplacePlayerContent event={event} />}
		</RegistrationPageWrapper>
	)
}

function ReplacePlayerContent({ event }: { event: ClubEventDetail }) {
	const router = useRouter()
	const eventUrl = getEventUrl(event)
	const { data: player, isLoading: playerLoading } = useMyPlayer()
	const { data: registrationData, isLoading: regLoading } = usePlayerRegistration(
		event.id,
		player?.id,
	)
	const swapPlayers = useSwapPlayers(event.id)

	const [sourceSlotId, setSourceSlotId] = useState<number | undefined>(undefined)
	const [targetPlayer, setTargetPlayer] = useState<{
		id: number
		name: string
	} | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const isLoading = playerLoading || regLoading

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-48 w-full" />
			</div>
		)
	}

	const registration = registrationData?.registration

	if (!registration) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Replace Player</CardTitle>
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
	const excludeIds = filledSlots.map((s) => s.player!.id)

	const handleTargetSelect = useCallback((playerId: number, playerName: string) => {
		setTargetPlayer({ id: playerId, name: playerName })
	}, [])

	const handleReplace = async () => {
		if (!sourceSlotId || !targetPlayer) return

		setIsSubmitting(true)
		try {
			await swapPlayers.mutateAsync({
				slotId: sourceSlotId,
				playerId: targetPlayer.id,
			})
			toast.success("Player replaced successfully")
			router.push(`${eventUrl}/manage`)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to replace player")
			setIsSubmitting(false)
		}
	}

	const canReplace = sourceSlotId !== undefined && targetPlayer !== null

	return (
		<Card>
			<CardHeader>
				<CardTitle>Replace Player</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<p className="text-sm font-medium">Select player to replace</p>
					<RadioGroup
						value={sourceSlotId ? String(sourceSlotId) : undefined}
						onValueChange={(value) => setSourceSlotId(Number(value))}
					>
						{filledSlots.map((slot) => (
							<div key={slot.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
								<RadioGroupItem
									value={String(slot.id)}
									id={`slot-${slot.id}`}
									disabled={isSubmitting}
								/>
								<Label htmlFor={`slot-${slot.id}`} className="cursor-pointer text-sm">
									{slot.player?.firstName} {slot.player?.lastName}
								</Label>
							</div>
						))}
					</RadioGroup>
				</div>

				{sourceSlotId && (
					<div className="space-y-2">
						<p className="text-sm font-medium">Select replacement player</p>
						{targetPlayer ? (
							<div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
								<span>{targetPlayer.name}</span>
								<button
									type="button"
									className="text-xs text-destructive hover:underline"
									onClick={() => setTargetPlayer(null)}
								>
									Change
								</button>
							</div>
						) : (
							<PlayerPicker
								eventId={event.id}
								onSelect={handleTargetSelect}
								excludeIds={excludeIds}
							/>
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
					<Button onClick={() => void handleReplace()} disabled={!canReplace || isSubmitting}>
						{isSubmitting ? "Replacing..." : "Replace"}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
