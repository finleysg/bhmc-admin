import { notFound } from "next/navigation"

import type { Player, PlayerAdminRoles } from "@repo/domain/types"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { apiGet, apiRequest } from "@/lib/server-api"

import { PlayerForm } from "../components/player-form"
import { PlayerRolesCard } from "../components/player-roles-card"

export default async function EditPlayerPage({
	params,
}: {
	params: Promise<{ playerId: string }>
}) {
	const id = Number((await params).playerId)
	if (!Number.isInteger(id)) notFound()

	// Roles are optional: 409 means no login account, 403 means the viewer is not a Club Admin.
	const [player, roles] = await Promise.all([
		apiGet<Player>(`/registration/players/${id}`),
		apiRequest<PlayerAdminRoles>(`/players/${id}/roles`),
	])

	return (
		<div className="mx-auto min-h-screen max-w-3xl space-y-6 md:py-8">
			<Card>
				<CardHeader>
					<CardTitle className="font-heading text-xl">
						{player.firstName} {player.lastName}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<PlayerForm player={player} />
				</CardContent>
			</Card>
			{roles.ok ? (
				<PlayerRolesCard playerId={id} current={roles.data} />
			) : (
				roles.status === 409 && <PlayerRolesCard playerId={id} current={null} />
			)}
		</div>
	)
}
