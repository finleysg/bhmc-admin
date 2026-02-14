import Image from "next/image"
import { Mail, Phone, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import type { Ace, BoardMember, MajorChampion, PlayerDetail } from "@/lib/types"
import { PlayerBadges } from "./player-badges"
import { PlayerTrophies } from "./player-trophies"

interface PlayerProfileCardProps {
	player: PlayerDetail
	boardMember?: BoardMember
	championships: MajorChampion[]
	aces: Ace[]
}

export function PlayerProfileCard({
	player,
	boardMember,
	championships,
	aces,
}: PlayerProfileCardProps) {
	const initials = `${player.first_name.charAt(0)}${player.last_name.charAt(0)}`
	const profileImageUrl = player.profile_picture
		? resolvePhotoUrl(player.profile_picture.mobile_url)
		: undefined

	return (
		<Card>
			<CardContent className="p-4 sm:p-6">
				<h1 className="mb-4 text-2xl font-heading font-semibold text-primary">
					{player.first_name} {player.last_name}
				</h1>
				<div className="grid gap-6 md:grid-cols-3">
					{/* Profile image — fills column */}
					{profileImageUrl ? (
						<div className="relative aspect-3/4 overflow-hidden rounded-sm bg-muted">
							<Image
								src={profileImageUrl}
								alt={`${player.first_name} ${player.last_name}`}
								fill
								className="object-cover"
								sizes="(min-width: 768px) 33vw, 100vw"
							/>
						</div>
					) : (
						<div className="flex aspect-3/4 items-center justify-center rounded-sm bg-muted text-4xl font-medium text-muted-foreground">
							{initials}
						</div>
					)}

					{/* Contact info + player details */}
					<div className="space-y-4">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold text-primary">Contact Information</h3>
							{player.email && (
								<a
									href={`mailto:${player.email}`}
									className="flex items-center gap-2 text-sm hover:underline"
								>
									<Mail className="size-3.5 text-muted-foreground" />
									{player.email}
								</a>
							)}
							{player.phone_number && (
								<a
									href={`tel:${player.phone_number}`}
									className="flex items-center gap-2 text-sm hover:underline"
								>
									<Phone className="size-3.5 text-muted-foreground" />
									{player.phone_number}
								</a>
							)}
						</div>

						<div className="space-y-2">
							<h3 className="text-sm font-semibold text-primary">Player Details</h3>
							<PlayerBadges isMember={Boolean(player.is_member)} boardMember={boardMember} />
							{player.tee && <p className="text-sm text-muted-foreground">Tees: {player.tee}</p>}
							{aces.length > 0 && (
								<div className="space-y-1">
									{aces.map((ace) => (
										<div key={ace.id} className="flex items-center gap-2 text-sm">
											<Target className="size-3.5 shrink-0 text-amber-500" />
											<span>
												Hole in one — {ace.hole_name} ({ace.season})
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Championships */}
					<div className="space-y-2">
						<h3 className="text-sm font-semibold text-primary">First Place Finishes</h3>
						<PlayerTrophies championships={championships} />
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
