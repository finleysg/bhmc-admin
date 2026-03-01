"use client"

import { useCallback, useRef, useState } from "react"
import { Check, Menu } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { RegistrationType } from "@/lib/event-utils"
import { useMyFriends } from "@/lib/hooks/use-my-friends"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import type { FeePlayer } from "@/lib/registration/fee-utils"
import { useRegistration } from "@/lib/registration/registration-context"
import type { PlayerSummary } from "@/lib/types"

interface FriendPickerProps {
	onSelect: (playerId: number, playerName: string, player: FeePlayer) => void
	excludeIds: number[]
}

export function FriendPicker({ onSelect, excludeIds }: FriendPickerProps) {
	const { data: myPlayer } = useMyPlayer()
	const { data: friends } = useMyFriends(myPlayer?.id)
	const { clubEvent } = useRegistration()
	const [sheetOpen, setSheetOpen] = useState(false)

	if (!friends || friends.length === 0) return null

	const handleSelect = (friend: PlayerSummary) => {
		if (clubEvent?.registration_type === RegistrationType.MembersOnly && !friend.is_member) {
			toast.warning(
				`${friend.first_name} ${friend.last_name} is not a member and cannot be added to this event.`,
			)
			return
		}
		const playerName = `${friend.first_name} ${friend.last_name}`
		const feePlayer: FeePlayer = {
			birthDate: friend.birth_date ?? null,
			isMember: friend.is_member,
			lastSeason: friend.last_season ?? null,
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
						<FriendList friends={friends} onSelect={handleSelect} excludeIds={excludeIds} />
					</CardContent>
				</Card>
			</div>

			{/* Mobile: Sheet */}
			<div className="md:hidden">
				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
							<FriendList friends={friends} onSelect={handleSelect} excludeIds={excludeIds} />
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
	excludeIds,
}: {
	friends: PlayerSummary[]
	onSelect: (friend: PlayerSummary) => void
	excludeIds: number[]
}) {
	const [justAdded, setJustAdded] = useState<number | null>(null)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleClick = useCallback(
		(friend: PlayerSummary) => {
			if (excludeIds.includes(friend.id)) return
			onSelect(friend)
			setJustAdded(friend.id)
			if (timerRef.current) clearTimeout(timerRef.current)
			timerRef.current = setTimeout(() => setJustAdded(null), 2000)
		},
		[excludeIds, onSelect],
	)

	return (
		<ul className="space-y-1">
			{friends.map((friend) => {
				const isInSlots = excludeIds.includes(friend.id)
				const isJustAdded = justAdded === friend.id
				const isSettled = isInSlots && !isJustAdded

				return (
					<li key={friend.id}>
						<button
							type="button"
							disabled={isInSlots}
							className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
								isJustAdded
									? "pointer-events-none text-emerald-600"
									: isSettled
										? "pointer-events-none text-muted-foreground opacity-60"
										: "hover:bg-accent"
							}`}
							onClick={() => handleClick(friend)}
						>
							{(isJustAdded || isSettled) && <Check className="mr-1.5 size-3.5 shrink-0" />}
							<span className="flex-1">
								{friend.first_name} {friend.last_name}
								{!friend.is_member && (
									<span className="ml-1 text-xs text-muted-foreground">(guest)</span>
								)}
							</span>
							{isJustAdded && <span className="text-xs font-medium text-emerald-600">Added!</span>}
						</button>
					</li>
				)
			})}
		</ul>
	)
}
