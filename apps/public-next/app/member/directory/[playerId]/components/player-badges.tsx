import { Badge } from "@/components/ui/badge"
import type { BoardMember } from "@/lib/types"

interface PlayerBadgesProps {
	isMember: boolean
	boardMember?: BoardMember
}

export function PlayerBadges({ isMember, boardMember }: PlayerBadgesProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{isMember ? (
				<Badge variant="default">Member</Badge>
			) : (
				<Badge variant="secondary">Non-Member</Badge>
			)}
			{boardMember && <Badge variant="outline">{boardMember.role}</Badge>}
		</div>
	)
}
