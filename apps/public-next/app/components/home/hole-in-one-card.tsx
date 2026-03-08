import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Markdown } from "@/components/markdown"
import { PlayerLink } from "@/components/player-link"
import { format } from "date-fns"
import { parseApiDate } from "@/lib/date-utils"
import type { Ace, PageContent } from "@/lib/types"

interface HoleInOneCardProps {
	content: PageContent | undefined
	aces: Ace[]
}

export function HoleInOneCard({ content, aces }: HoleInOneCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{content?.title ?? "Hole-in-One Club"}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<Markdown content={content?.content} />
				{aces.length === 0 ? (
					<p className="text-sm text-primary">
						No great shots yet for this season. <small>(It only takes one good swing!)</small>
					</p>
				) : (
					<div className="space-y-1">
						{aces.map((ace) => {
							const shotDate = parseApiDate(ace.shot_date)
							return (
								<div key={ace.id} className="flex items-center gap-4 text-sm">
									<span className="shrink-0 text-muted-foreground">
										{format(shotDate, "yyyy-MM-dd")}
									</span>
									<span className="flex-1">
										<PlayerLink player={ace.player} />
									</span>
									<span>{ace.hole_name}</span>
								</div>
							)
						})}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
