"use client"

import { useState } from "react"
import { Trophy } from "lucide-react"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import type { MajorChampion } from "@/lib/types"

interface AllWinsDialogProps {
	championships: MajorChampion[]
}

export function AllWinsDialog({ championships }: AllWinsDialogProps) {
	const [open, setOpen] = useState(false)
	const sorted = [...championships].sort((a, b) => b.season - a.season)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button className="mt-1 text-sm font-medium text-primary hover:underline">more...</button>
			</DialogTrigger>
			<DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
				<DialogHeader>
					<DialogTitle>All First Place Finishes</DialogTitle>
				</DialogHeader>
				<div className="space-y-2">
					{sorted.map((c) => (
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
				</div>
			</DialogContent>
		</Dialog>
	)
}
