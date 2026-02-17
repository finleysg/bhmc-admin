"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getEventUrl } from "@/lib/event-utils"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { useRegistrationNotes } from "@/lib/hooks/use-manage-mutations"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"

export default function AddNotesPage() {
	const router = useRouter()
	const { event, isLoading: eventLoading } = useEventFromParams()
	const { data: player, isLoading: playerLoading } = useMyPlayer()
	const { data: registrationData, isLoading: regLoading } = usePlayerRegistration(
		event?.id,
		player?.id,
	)
	const updateNotes = useRegistrationNotes()

	const registration = registrationData?.registration
	const initialNotes = registration?.notes ?? ""
	const [notes, setNotes] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const isLoading = eventLoading || playerLoading || regLoading
	const currentNotes = notes ?? initialNotes

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
					<CardTitle>Add Notes</CardTitle>
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

	const handleSave = async () => {
		if (currentNotes === initialNotes) {
			router.push(`${eventUrl}/manage`)
			return
		}

		setIsSubmitting(true)
		try {
			await updateNotes.mutateAsync({
				registrationId: registration.id,
				notes: currentNotes,
			})
			toast.success("Notes saved")
			router.push(`${eventUrl}/manage`)
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to save notes")
			setIsSubmitting(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Add Notes</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<label htmlFor="notes" className="mb-1 block text-sm font-medium">
						Notes / Player Requests
					</label>
					<Textarea
						id="notes"
						rows={6}
						value={currentNotes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Enter any special requests or notes for your registration..."
						disabled={isSubmitting}
					/>
				</div>

				<div className="flex justify-end gap-2">
					<Button
						variant="secondary"
						onClick={() => router.push(`${eventUrl}/manage`)}
						disabled={isSubmitting}
					>
						Back
					</Button>
					<Button onClick={() => void handleSave()} disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : "Save"}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
