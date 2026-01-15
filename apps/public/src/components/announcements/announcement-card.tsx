import ReactMarkdown from "react-markdown"
import gfm from "remark-gfm"

import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { Announcement } from "../../models/announcement"
import { AnnouncementVisibility } from "../../models/codes"
import { DocumentCard } from "../document/document-card"

interface AnnouncementCardProps {
	announcement: Announcement
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
	const { data: player } = useMyPlayerRecord()

	const show = (visibility: string) => {
		if (visibility === AnnouncementVisibility.All) {
			return true
		} else if (visibility === AnnouncementVisibility.MembersOnly) {
			return player?.isMember
		} else {
			return !player?.isMember
		}
	}

	if (show(announcement.visibility)) {
		return (
			<div className="announcement mb-8">
				<h5 className="text-primary-emphasis">{announcement.title}</h5>
				<ReactMarkdown remarkPlugins={[gfm]}>{announcement.text}</ReactMarkdown>
				<div>
					{announcement.documents?.map((doc) => {
						return <DocumentCard key={doc.id.toString()} document={doc} />
					})}
				</div>
			</div>
		)
	}
	return null
}
