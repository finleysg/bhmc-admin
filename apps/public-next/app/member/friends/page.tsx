"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { useMyFriends, useAddFriend, useRemoveFriend } from "@/lib/hooks/use-my-friends"
import { FriendList } from "./components/friend-list"
import { FriendSearch } from "./components/friend-search"

export default function FriendsPage() {
	const { data: player } = useMyPlayer()
	const { data: friends, isLoading } = useMyFriends(player?.id)
	const { mutate: addFriend } = useAddFriend(player?.id)
	const { mutate: removeFriend } = useRemoveFriend(player?.id)

	const friendIds = new Set(friends?.map((f) => f.id) ?? [])

	return (
		<div className="max-w-md">
			<Link
				href="/member"
				className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back
			</Link>
			<h1 className="mb-6 text-2xl font-semibold text-primary">My Friends</h1>

			<FriendSearch onAdd={(id) => addFriend(id)} existingFriendIds={friendIds} />

			<p className="mb-3 text-sm text-muted-foreground">Click the star to remove from your list</p>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			) : (
				<FriendList friends={friends ?? []} onRemove={(id) => removeFriend(id)} />
			)}
		</div>
	)
}
