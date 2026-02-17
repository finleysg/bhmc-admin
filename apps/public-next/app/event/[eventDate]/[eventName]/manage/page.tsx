"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getEventUrl } from "@/lib/event-utils"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { getGroupStartName } from "@/lib/registration/reserve-utils"
import type { ClubEventDetail, Course } from "@/lib/types"

interface ManageOption {
	key: string
	title: string
	description: string
}

const OPTIONS: ManageOption[] = [
	{
		key: "addPlayers",
		title: "Add Players",
		description: "Add one or more players to your group, assuming there is space available",
	},
	{
		key: "dropPlayers",
		title: "Drop Players",
		description:
			"Drop one or more players from your group. A refund will be triggered for fees paid.",
	},
	{
		key: "moveGroup",
		title: "Move Group",
		description: "Move your group to another open spot.",
	},
	{
		key: "replacePlayer",
		title: "Replace Player",
		description: "Replace one of the players in your group with another player.",
	},
	{
		key: "addNotes",
		title: "Add Notes",
		description: "Add a special request or other notes to your registration.",
	},
	{
		key: "updateRegistration",
		title: "Get in Skins",
		description: "Pay for skins or other extras.",
	},
]

export default function ManagePage() {
	const { event, isLoading: eventLoading } = useEventFromParams()
	const { data: player, isLoading: playerLoading } = useMyPlayer()
	const { data: registrationData, isLoading: regLoading } = usePlayerRegistration(
		event?.id,
		player?.id,
	)
	const router = useRouter()

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
					<CardTitle>Manage My Group</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground">No registration found.</p>
					<div className="flex justify-end">
						<Button variant="secondary" onClick={() => router.push(eventUrl)}>
							Back
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	const startInfo = deriveStartInfo(event, registration)

	const handleAction = (key: string) => {
		if (key === "updateRegistration") {
			router.push(`${eventUrl}/edit`)
		} else {
			toast.info("Coming soon")
		}
	}

	const filteredOptions = OPTIONS.filter((opt) => opt.key !== "moveGroup" || event.can_choose)

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Manage My Group
					{startInfo && (
						<span className="ml-2 text-sm font-normal text-muted-foreground">({startInfo})</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<ul className="space-y-3">
					{filteredOptions.map((opt) => (
						<li key={opt.key} className="border-b border-border/50 pb-3 last:border-b-0">
							<button
								type="button"
								className="text-sm font-semibold text-primary hover:underline"
								onClick={() => handleAction(opt.key)}
							>
								{opt.title}
							</button>
							<p className="mt-0.5 text-sm italic text-muted-foreground">{opt.description}</p>
						</li>
					))}
				</ul>
				<div className="flex justify-end pt-2">
					<Button variant="secondary" onClick={() => router.push(eventUrl)}>
						Back
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

function deriveStartInfo(
	event: ClubEventDetail,
	registration: {
		courseId: number | null
		slots: { holeId: number | null; startingOrder: number }[]
	},
): string | null {
	const course = event.courses.find((c: Course) => c.id === registration.courseId)
	if (!course) return null

	const firstSlot = registration.slots[0]
	if (!firstSlot) return null

	const hole = course.holes.find((h) => h.id === firstSlot.holeId)
	const holeNumber = hole?.hole_number ?? 1
	const startingOrder = firstSlot.startingOrder

	const startName = getGroupStartName(event, holeNumber, startingOrder)
	return `${course.name} ${startName}`
}
