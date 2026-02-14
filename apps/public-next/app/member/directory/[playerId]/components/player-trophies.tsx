import { Trophy } from "lucide-react"
import type { MajorChampion } from "@/lib/types"
import { AllWinsDialog } from "./all-wins-dialog"

const MAX_VISIBLE = 6

interface PlayerTrophiesProps {
	championships: MajorChampion[]
}

export function PlayerTrophies({ championships }: PlayerTrophiesProps) {
	const sorted = [...championships].sort((a, b) => b.season - a.season)

	if (sorted.length === 0) {
		return <p className="text-sm text-muted-foreground">No first place finishes</p>
	}

	const visible = sorted.slice(0, MAX_VISIBLE)
	const hasMore = sorted.length > MAX_VISIBLE

	return (
		<div className="space-y-2">
			{visible.map((c) => (
				<div key={c.id} className="flex items-start gap-2">
					<Trophy className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
					<div className="text-sm">
						<p className="font-medium">
							{c.event_name} ({c.season})
						</p>
						<p className="text-xs text-muted-foreground">
							{c.flight} — {c.is_net ? "Net" : "Gross"} {c.score}
						</p>
					</div>
				</div>
			))}
			{hasMore && <AllWinsDialog championships={championships} />}
		</div>
	)
}
