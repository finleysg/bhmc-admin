"use client"

import { useAuth } from "@/lib/auth-context"
import { Markdown } from "@/components/markdown"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import type { Announcement } from "@/lib/types"
import { FileText } from "lucide-react"
import { format } from "date-fns"

interface AnnouncementListProps {
	announcements: Announcement[]
}

export function AnnouncementList({ announcements }: AnnouncementListProps) {
	const { isAuthenticated } = useAuth()

	const visible = announcements.filter((a) => {
		if (a.visibility === "A") return true
		if (a.visibility === "M") return isAuthenticated
		if (a.visibility === "N") return !isAuthenticated
		return true
	})

	return (
		<div className="space-y-6">
			{visible.map((announcement) => (
				<div key={announcement.id} className="space-y-2">
					<h5 className="font-semibold text-primary">{announcement.title}</h5>
					<Markdown content={announcement.text} />
					{announcement.documents.length > 0 && (
						<div className="space-y-1">
							{announcement.documents.map((doc) => (
								<a
									key={doc.id}
									href={resolvePhotoUrl(doc.file)}
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-2 rounded bg-muted p-2 text-sm text-primary hover:bg-accent"
								>
									<FileText className="size-4 shrink-0" />
									<div className="min-w-0">
										<p className="truncate font-medium">{doc.title}</p>
										<p className="text-xs text-muted-foreground">
											Updated: {format(new Date(doc.last_update), "MMMM d, yyyy h:mm aaaa")}
										</p>
									</div>
								</a>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	)
}
