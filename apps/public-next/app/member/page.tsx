"use client"

import { User, Users, BarChart3, Trophy } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { ProfileHeader } from "./components/profile-header"
import { MemberCard } from "./components/member-card"

export default function MemberHubPage() {
	const { data: player, isLoading } = useMyPlayer()

	return (
		<div className="max-w-3xl">
			{isLoading ? (
				<div className="flex flex-col items-center gap-3">
					<Skeleton className="size-24 rounded-full" />
					<Skeleton className="h-6 w-40" />
				</div>
			) : player ? (
				<ProfileHeader player={player} />
			) : null}

			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				<MemberCard
					title="Account"
					description="Manage your account information and change your password"
					icon={User}
					href="/member/account"
				/>
				<MemberCard
					title="Friends"
					description="View and manage your friends list"
					icon={Users}
					href="/member/friends"
				/>
				<MemberCard
					title="Scores"
					description="View your scoring history and download your scores to Excel"
					icon={BarChart3}
					href="/member/scores"
				/>
				<MemberCard
					title="Results"
					description="Check your tournament results, season long points, and skins"
					icon={Trophy}
					href="/member/results"
				/>
			</div>
		</div>
	)
}
