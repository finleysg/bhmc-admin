import type { Player } from "@repo/domain/types"

import { apiGet } from "@/lib/server-api"

import { PlayerSearch } from "./components/player-search"
import { PlayerTable } from "./components/player-table"

const MIN_QUERY = 3

export default async function PlayersPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string; all?: string }>
}) {
	const { q = "", all } = await searchParams
	const query = q.trim()
	const membersOnly = all !== "1"

	let players: Player[] | null = null
	if (query.length >= MIN_QUERY) {
		const params = new URLSearchParams({ searchText: query })
		// isMember=false would mean "non-members only"; omitting it means everyone.
		if (membersOnly) params.set("isMember", "true")
		players = await apiGet<Player[]>(`/registration/players?${params}`)
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6 md:py-8">
			<PlayerSearch query={q} membersOnly={membersOnly} />
			{players ? (
				<PlayerTable players={players} />
			) : (
				<p className="py-8 text-center text-muted-foreground">
					Type at least {MIN_QUERY} characters to search
				</p>
			)}
		</div>
	)
}
