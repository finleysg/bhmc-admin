"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { useRegistration } from "@/lib/registration/registration-context"

export default function ManageNotesPage() {
	const router = useRouter()
	const queryClient = useQueryClient()
	const { clubEvent } = useRegistration()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(clubEvent?.id, player?.id)

	const registration = registrationData?.registration
	const initialNotes = registration?.notes ?? ""

	const [notes, setNotes] = useState(initialNotes)
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		setNotes(initialNotes)
	}, [initialNotes])

	if (!clubEvent || !registration) return null

	const manageUrl = `${getEventUrl(clubEvent)}/manage`
	const hasChanged = notes !== initialNotes

	const handleSave = async () => {
		if (!hasChanged) return
		setIsSubmitting(true)
		try {
			const response = await fetch(`/api/registration/${registration.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notes }),
			})
			if (!response.ok) {
				throw new Error("Failed to save notes")
			}
			await queryClient.invalidateQueries({
				queryKey: ["player-registration", clubEvent.id, player?.id],
			})
			toast.success("Notes saved")
			router.push(manageUrl)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to save notes")
			setIsSubmitting(false)
		}
	}

	return (
		<div className="max-w-[560px]">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Add Notes</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Label htmlFor="manage-notes">Notes / Player Requests</Label>
						<Textarea
							id="manage-notes"
							rows={8}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Enter any special requests or notes for your registration..."
							disabled={isSubmitting}
						/>
					</div>
				</CardContent>
				<CardFooter className="flex-col items-stretch gap-4">
					<Separator />
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => router.push(manageUrl)} disabled={isSubmitting}>
							Back
						</Button>
						<Button onClick={() => void handleSave()} disabled={isSubmitting || !hasChanged}>
							{isSubmitting ? "Saving..." : "Save"}
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
