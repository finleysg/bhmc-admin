"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { useRegistration } from "@/lib/registration/registration-context"
import { getGroupStartName } from "@/lib/start-name"

interface ManageOption {
	key: string
	title: string
	description: string
	href: string
	disabled?: boolean
}

export default function ManagePage() {
	const { clubEvent } = useRegistration()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(clubEvent?.id, player?.id)

	const registration = registrationData?.registration
	if (!clubEvent || !registration) return null

	const eventUrl = getEventUrl(clubEvent)

	// Derive starting location info
	const course = clubEvent.courses.find((c) => c.id === registration.courseId)
	const startingHoleId = registration.slots[0]?.holeId
	const startingHole = course?.holes.find((h) => h.id === startingHoleId)
	const startingHoleNumber = startingHole ? startingHole.hole_number : 1
	const startingOrder = registration.slots[0]?.startingOrder ?? 0
	const startName = getGroupStartName(clubEvent, startingHoleNumber, startingOrder)

	const locationText = course ? `${course.name} ${startName}` : startName

	const registrationClosed = clubEvent.registration_window === "past"

	const options: ManageOption[] = [
		{
			key: "addPlayers",
			title: "Add Players",
			description: "Add one or more players to your group, assuming there is space available",
			href: `${eventUrl}/manage/add`,
			disabled: registrationClosed,
		},
		{
			key: "dropPlayers",
			title: "Drop Players",
			description:
				"Drop one or more players from your group.",
			href: `${eventUrl}/manage/drop`,
			disabled: registrationClosed,
		},
		...(clubEvent.can_choose
			? [
					{
						key: "moveGroup",
						title: "Move Group",
						description: "Move your group to another open spot.",
						href: `${eventUrl}/manage/move`,
						disabled: registrationClosed,
					},
				]
			: []),
		{
			key: "replacePlayer",
			title: "Replace Player",
			description: "Replace one of the players in your group with another player.",
			href: `${eventUrl}/manage/replace`,
			disabled: registrationClosed,
		},
		{
			key: "addNotes",
			title: "Add Notes",
			description: "Add a special request or other notes to your registration.",
			href: `${eventUrl}/manage/notes`,
			disabled: registrationClosed,
		},
		{
			key: "updateRegistration",
			title: "Get in Skins",
			description: "Pay for skins or other extras.",
			href: `${eventUrl}/manage/edit`,
		},
	]

	return (
		<div className="max-w-[560px]">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">
						Manage My Group
						{locationText && (
							<span className="text-muted-foreground ml-2 text-sm font-normal">
								({locationText})
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-4">
						{options.map((opt) => (
							<li key={opt.key}>
								{opt.disabled ? (
									<span className="text-muted-foreground font-semibold">{opt.title}</span>
								) : (
									<Link
										href={opt.href}
										className="text-primary hover:text-primary/80 font-semibold no-underline"
									>
										{opt.title}
									</Link>
								)}
								<p className="text-muted-foreground mt-1 text-sm italic">{opt.description}</p>
							</li>
						))}
					</ul>
				</CardContent>
				<CardFooter className="flex-col items-stretch gap-4">
					<Separator />
					<div className="flex justify-end">
						<Button variant="ghost" asChild>
							<Link href={eventUrl}>Back</Link>
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
