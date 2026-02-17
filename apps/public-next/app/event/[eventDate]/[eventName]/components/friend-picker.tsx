"use client"

import { Menu } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet"
import { RegistrationType } from "@/lib/event-utils"
import { useMyFriends } from "@/lib/hooks/use-my-friends"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import type { FeePlayer } from "@/lib/registration/fee-utils"
import { useRegistration } from "@/lib/registration/registration-context"
import type { PlayerSummary } from "@/lib/types"

interface FriendPickerProps {
	onSelect: (playerId: number, playerName: string, player: FeePlayer) => void
}

export function FriendPicker({ onSelect }: FriendPickerProps) {
	const { data: myPlayer } = useMyPlayer()
	const { data: friends } = useMyFriends(myPlayer?.id)
	const { clubEvent } = useRegistration()

	if (!friends || friends.length === 0) return null

	const handleSelect = (friend: PlayerSummary) => {
		if (
			clubEvent?.registration_type === RegistrationType.MembersOnly &&
			!friend.is_member
		) {
			toast.warning(
				`${friend.first_name} ${friend.last_name} is not a member and cannot be added to this event.`,
			)
			return
		}
		const playerName = `${friend.first_name} ${friend.last_name}`
		const feePlayer: FeePlayer = {
			birthDate: null,
			isMember: friend.is_member,
			lastSeason: null,
		}
		onSelect(friend.id, playerName, feePlayer)
	}

	return (
		<>
			{/* Desktop: Card */}
			<div className="hidden md:block">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">My Friends</CardTitle>
					</CardHeader>
					<CardContent>
						<FriendList friends={friends} onSelect={handleSelect} />
					</CardContent>
				</Card>
			</div>

			{/* Mobile: Sheet */}
			<div className="md:hidden">
				<Sheet>
					<SheetTrigger asChild>
						<Button variant="outline" size="sm">
							<Menu className="size-4" />
							Friends
						</Button>
					</SheetTrigger>
					<SheetContent side="right">
						<SheetHeader>
							<SheetTitle>My Friends</SheetTitle>
						</SheetHeader>
						<div className="p-4">
							<FriendList friends={friends} onSelect={handleSelect} />
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</>
	)
}

function FriendList({
	friends,
	onSelect,
}: {
	friends: PlayerSummary[]
	onSelect: (friend: PlayerSummary) => void
}) {
	return (
		<ul className="space-y-1">
			{friends.map((friend) => (
				<li key={friend.id}>
					<button
						type="button"
						className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
						onClick={() => onSelect(friend)}
					>
						{friend.first_name} {friend.last_name}
						{!friend.is_member && (
							<span className="ml-1 text-xs text-muted-foreground">(guest)</span>
						)}
					</button>
				</li>
			))}
		</ul>
	)
}
