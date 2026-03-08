import { notFound } from "next/navigation"
import { fetchDjangoAuthenticated } from "@/lib/fetchers"
import type { Ace, BoardMember, MajorChampion, PlayerDetail } from "@/lib/types"
import { PlayerProfileCard } from "./components/player-profile-card"

interface PlayerProfilePageProps {
	params: Promise<{ playerId: string }>
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
	const { playerId } = await params

	let player: PlayerDetail
	try {
		player = await fetchDjangoAuthenticated<PlayerDetail>(`/players/${playerId}/`)
	} catch {
		notFound()
	}

	const [boardMembers, championships, aces] = await Promise.all([
		fetchDjangoAuthenticated<BoardMember[]>("/board/").catch(() => []),
		fetchDjangoAuthenticated<MajorChampion[]>(`/champions/?player=${playerId}`).catch(() => []),
		fetchDjangoAuthenticated<Ace[]>(`/aces/?player_id=${playerId}`).catch(() => []),
	])

	const boardMember = boardMembers.find((m) => m.player.id === Number(playerId))

	return (
		<div className="max-w-4xl">
			<PlayerProfileCard
				player={player}
				boardMember={boardMember}
				championships={championships}
				aces={aces}
			/>
		</div>
	)
}
