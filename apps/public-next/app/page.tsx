export const dynamic = "force-dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDjango } from "@/lib/fetchers"
import { currentSeason } from "@/lib/constants"
import type {
	Ace,
	Announcement,
	ClubEvent,
	LowScore,
	PageContent,
	PhotoData,
	StaticDocument,
} from "@/lib/types"
import { AnnouncementList } from "./components/home/announcement-list"
import { UpcomingEvents } from "./components/home/upcoming-events"
import { QuickLinks } from "./components/home/quick-links"
import { ClubDocumentsCard } from "./components/home/club-documents-card"
import { HoleInOneCard } from "./components/home/hole-in-one-card"
import { LowScoresCard } from "./components/home/low-scores-card"
import { RandomPhoto } from "./components/home/random-photo"

async function fetchStaticDoc(code: string) {
	try {
		const docs = await fetchDjango<StaticDocument[]>(`/static-documents/?code=${code}`)
		return docs[0]
	} catch {
		return undefined
	}
}

export default async function HomePage() {
	const [
		announcements,
		photos,
		events,
		holeInOneContentArr,
		aces,
		lowScores,
		acctDoc,
		soDoc,
		bylawDoc,
		finDoc,
		hcpDoc,
		tut1Doc,
		tut2Doc,
	] = await Promise.all([
		fetchDjango<Announcement[]>("/news/"),
		fetchDjango<PhotoData[]>("/photos/random/?take=1"),
		fetchDjango<ClubEvent[]>(`/events/?season=${currentSeason}`, { revalidate: 300, tags: ["events"] }),
		fetchDjango<PageContent[]>("/page-content/?key=hole-in-one"),
		fetchDjango<Ace[]>(`/aces/?season=${currentSeason}`),
		fetchDjango<LowScore[]>(`/low-scores/?season=${currentSeason}`),
		fetchStaticDoc("ACCTS"),
		fetchStaticDoc("SO"),
		fetchStaticDoc("BYLAW"),
		fetchStaticDoc("FIN"),
		fetchStaticDoc("HCP"),
		fetchStaticDoc("TUT1"),
		fetchStaticDoc("TUT2"),
	])

	const holeInOneContent = holeInOneContentArr[0]
	const specialOrders = [acctDoc, soDoc].filter(Boolean) as StaticDocument[]
	const clubDocuments = [bylawDoc, finDoc, hcpDoc, tut1Doc, tut2Doc].filter(
		Boolean,
	) as StaticDocument[]

	return (
		<div className="grid gap-6 lg:grid-cols-12">
			{/* Left column */}
			<div className="space-y-6 lg:col-span-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-primary">Club News and Announcements</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<AnnouncementList announcements={announcements} />
						<hr className="border-border" />
						<RandomPhoto photo={photos[0]} />
						<hr className="border-border" />
						<ClubDocumentsCard documents={specialOrders} title="Special Order Info" />
					</CardContent>
				</Card>
			</div>

			{/* Middle column */}
			<div className="space-y-6 lg:col-span-3">
				<UpcomingEvents events={events} />
				<QuickLinks />
				<ClubDocumentsCard documents={clubDocuments} />
			</div>

			{/* Right column */}
			<div className="space-y-6 lg:col-span-3">
				<HoleInOneCard content={holeInOneContent} aces={aces} />
				<LowScoresCard lowScores={lowScores} />
			</div>
		</div>
	)
}
