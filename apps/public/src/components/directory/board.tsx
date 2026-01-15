import React from "react"

import { Link } from "react-router-dom"

import { useAuth } from "../../hooks/use-auth"
import { useBoardMembers } from "../../hooks/use-board-members"
import { BoardMember } from "../../models/board-member"
import { LoadingSpinner } from "../spinners/loading-spinner"

interface BoardMemberProps {
	member: BoardMember
}

export function Officer({ member }: BoardMemberProps) {
	const { user } = useAuth()

	return (
		<div>
			<h6>{member.role}</h6>
			<p style={{ marginBottom: ".5rem" }}>
				{user.isAuthenticated ? (
					<Link className="text-success" to={`/directory/${member.player.id}`}>
						{member.player.name} <span>({member.expires})</span>
					</Link>
				) : (
					<React.Fragment>
						{member.player.name} <span>({member.expires})</span>
					</React.Fragment>
				)}
			</p>
			<p>
				<a href={`mailto: ${member.role.toLowerCase().replace(" ", "-")}@bhmc.org`}>
					{member.role.toLowerCase().replace(" ", "-")}@bhmc.org
				</a>
			</p>
		</div>
	)
}

export function Director({ member }: BoardMemberProps) {
	const { user } = useAuth()

	if (user.isAuthenticated) {
		return (
			<p>
				<Link className="text-success" to={`/directory/${member.player.id}`}>
					{member.player.name} <span>({member.expires ? member.expires : "Honorary"})</span>
				</Link>
			</p>
		)
	} else {
		return (
			<p>
				{member.player.name} <span>({member.expires ? member.expires : "Honorary"})</span>
			</p>
		)
	}
}

export function Officers() {
	const { data } = useBoardMembers()

	if (data?.length) {
		return (
			<div>
				{data
					?.filter((m) => !m.role.startsWith("Director"))
					.map((m) => (
						<Officer key={m.player.id} member={m} />
					))}
			</div>
		)
	} else {
		return <LoadingSpinner loading={true} paddingTop="60px" />
	}
}

export function Board() {
	const { data } = useBoardMembers()

	if (data?.length) {
		return (
			<div>
				{data
					?.filter((m) => m.role.startsWith("Director"))
					.map((m) => (
						<Director key={m.player.id} member={m} />
					))}
			</div>
		)
	} else {
		return <LoadingSpinner loading={true} paddingTop="60px" />
	}
}
