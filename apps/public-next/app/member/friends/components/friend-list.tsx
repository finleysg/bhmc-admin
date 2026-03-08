"use client"

import { Star } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { PlayerSummary } from "@/lib/types"

interface FriendListProps {
	friends: PlayerSummary[]
	onRemove: (friendId: number) => void
}

export function FriendList({ friends, onRemove }: FriendListProps) {
	if (friends.length === 0) {
		return <p className="text-sm text-muted-foreground">You haven&apos;t added any friends yet.</p>
	}

	return (
		<div className="divide-y rounded-md border">
			{friends.map((friend) => (
				<div key={friend.id} className="flex items-center justify-between p-3">
					<Link
						href={`/member/directory/${friend.id}`}
						className="text-sm font-medium hover:underline"
					>
						{friend.first_name} {friend.last_name}
					</Link>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onRemove(friend.id)}
						title="Remove friend"
						className="size-8"
					>
						<Star className="size-4 fill-yellow-400 text-yellow-400" />
					</Button>
				</div>
			))}
		</div>
	)
}
