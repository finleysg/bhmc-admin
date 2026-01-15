import { useLayoutEffect } from "react"

import { AnnouncementList } from "../components/announcements/announcement-list"
import { QuickLinksCard } from "../components/announcements/quick-links-card"
import { UpcomingEventsCard } from "../components/calendar/upcoming-events-card"
import { ClubDocumentsCard } from "../components/document/club-documents"
import { RandomPicList } from "../components/photo/random-pic-list"
import { HoleInOneCard } from "../components/results/hole-in-one"
import { LowScoresCard } from "../components/results/low-scores"
import { currentSeason } from "../utils/app-config"

export function HomeScreen() {
	const scrollToTop = () => window.scrollTo(0, 0)

	useLayoutEffect(() => {
		scrollToTop()
	}, [])

	return (
		<div className="content__inner">
			<div className="row">
				<div className="col-xl-6 col-lg-8">
					<div className="card mb-4">
						<div className="card-body">
							<h3 className="text-primary-emphasis" style={{ marginBottom: "1rem" }}>
								Club News and Announcements
							</h3>
							<AnnouncementList />
							<hr />
							<RandomPicList take={1} />
							<hr />
							<ClubDocumentsCard codes={["ACCTS", "SO"]} title="Special Order Info" />
						</div>
					</div>
				</div>
				<div className="col-xl-3 col-lg-4">
					<UpcomingEventsCard />
					<QuickLinksCard />
					<ClubDocumentsCard codes={["BYLAW", "FIN", "HCP", "TUT1", "TUT2"]} />
				</div>
				<div className="col-xl-3 col-lg-4">
					<HoleInOneCard />
					<LowScoresCard season={currentSeason} />
				</div>
			</div>
		</div>
	)
}
