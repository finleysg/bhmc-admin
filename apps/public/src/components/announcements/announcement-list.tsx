import { useQuery } from "@tanstack/react-query"

import { Announcement, AnnouncementApiSchema, AnnouncementData } from "../../models/announcement"
import { getMany } from "../../utils/api-client"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { AnnouncementCard } from "./announcement-card"

export function AnnouncementList() {
	const { data, status, fetchStatus } = useQuery({
		queryKey: ["news"],
		queryFn: async () => {
			const data = await getMany<AnnouncementData>("news", AnnouncementApiSchema)
			return data.map((a) => new Announcement(a))
		},
		staleTime: 1000 * 60 * 2,
	})

	return (
		<div>
			<OverlaySpinner loading={status === "pending" || fetchStatus === "fetching"} />
			{data?.map((announcement) => {
				return <AnnouncementCard key={announcement.id} announcement={announcement} />
			})}
		</div>
	)
}
