import { BoardMemberProps } from "../../models/board-member"

export function BoardMemberBadge({ boardMember }: BoardMemberProps) {
	if (boardMember) {
		return (
			<h6 className="text-info" style={{ marginBottom: "1rem" }}>
				⭐ Board Member ({boardMember.role})
			</h6>
		)
	}
	return null
}
