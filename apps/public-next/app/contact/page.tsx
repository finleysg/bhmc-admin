export const dynamic = "force-dynamic"

import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"
import { PlayerLink } from "@/components/player-link"
import { fetchDjango } from "@/lib/fetchers"
import type { BoardMember, PageContent } from "@/lib/types"

export default async function ContactPage() {
	const [officersArr, directorsArr, committeesArr, staffArr, boardMembers] = await Promise.all([
		fetchDjango<PageContent[]>("/page-content/?key=contact-officers"),
		fetchDjango<PageContent[]>("/page-content/?key=contact-directors"),
		fetchDjango<PageContent[]>("/page-content/?key=contact-committees"),
		fetchDjango<PageContent[]>("/page-content/?key=contact-staff"),
		fetchDjango<BoardMember[]>("/board/"),
	])

	const officers = officersArr[0]
	const directors = directorsArr[0]
	const committees = committeesArr[0]
	const staff = staffArr[0]

	const officerMembers = boardMembers.filter((m) => !m.role.startsWith("Director"))
	const directorMembers = boardMembers.filter((m) => m.role.startsWith("Director"))

	return (
		<div className="space-y-6">
			<div>
				<Button asChild size="sm">
					<Link href="/contact/message">Send Us a Message</Link>
				</Button>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle>{officers?.title ?? "Officers"}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Markdown content={officers?.content} />
						{officerMembers.map((member) => (
							<div key={member.id}>
								<h6 className="font-semibold">{member.role}</h6>
								<p className="mb-1">
									<PlayerLink player={member.player}>
										{member.player.first_name} {member.player.last_name}{" "}
										<span>({member.term_expires})</span>
									</PlayerLink>
								</p>
								<p>
									<a
										href={`mailto:${member.role.toLowerCase().replace(" ", "-")}@bhmc.org`}
										className="text-primary hover:underline"
									>
										{member.role.toLowerCase().replace(" ", "-")}@bhmc.org
									</a>
								</p>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{directors?.title ?? "Directors"}</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Markdown content={directors?.content} />
						{directorMembers.map((member) => (
							<p key={member.id}>
								<PlayerLink player={member.player}>
									{member.player.first_name} {member.player.last_name}{" "}
									<span>({member.term_expires ? member.term_expires : "Honorary"})</span>
								</PlayerLink>
							</p>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{committees?.title ?? "Committees"}</CardTitle>
					</CardHeader>
					<CardContent>
						<Markdown content={committees?.content} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>{staff?.title ?? "Staff"}</CardTitle>
					</CardHeader>
					<CardContent>
						<Markdown content={staff?.content} />
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
