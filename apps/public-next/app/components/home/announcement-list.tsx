"use client"

import { useAuth } from "@/lib/auth-context"
import { Markdown } from "@/components/markdown"
import { DocumentCard } from "@/components/document-card"
import type { Announcement } from "@/lib/types"

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
								<DocumentCard
									key={doc.id}
									title={doc.title}
									file={doc.file}
									lastUpdate={doc.last_update}
								/>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	)
}
