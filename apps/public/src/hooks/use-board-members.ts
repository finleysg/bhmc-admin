import { useQuery } from "@tanstack/react-query"

import { BoardMember, BoardMemberApiSchema, BoardMemberData } from "../models/board-member"
import { getMany } from "../utils/api-client"

export function useBoardMembers() {
	const endpoint = "board"
	return useQuery({
		queryKey: [endpoint],
		queryFn: () => getMany<BoardMemberData>(endpoint, BoardMemberApiSchema),
		select: (data) => data.map((member) => new BoardMember(member)),
	})
}
