export const dynamic = "force-dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Markdown } from "@/components/markdown"
import { DocumentCard } from "@/components/document-card"
import { DocumentList } from "@/components/document-list"
import { fetchDjango } from "@/lib/fetchers"
import { currentSeason } from "@/lib/constants"
import type { Document, PageContent, StaticDocument } from "@/lib/types"
import { TopPoints } from "./components/top-points"
import { PointsBreakdownTable } from "./components/points-breakdown-table"

export default async function PointsPage() {
	const [pageContentArr, slpgDocs, slpnDocs, historicalDocs] = await Promise.all([
		fetchDjango<PageContent[]>("/page-content/?key=season-long-points", { revalidate: 3600 }),
		fetchDjango<StaticDocument[]>("/static-documents/?code=SLPG").catch(() => []),
		fetchDjango<StaticDocument[]>("/static-documents/?code=SLPN").catch(() => []),
		fetchDjango<Document[]>("/documents/?type=P", { revalidate: 3600 }),
	])

	const pageContent = pageContentArr[0]
	const slpg = slpgDocs[0]
	const slpn = slpnDocs[0]
	const filteredDocs = historicalDocs.filter((d) => d.year !== currentSeason)

	return (
		<div className="grid gap-6 lg:grid-cols-12">
			{/* Left column */}
			<div className="space-y-6 lg:col-span-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-primary">Current Standings</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1">
						{slpg && (
							<DocumentCard
								title={slpg.document.title}
								file={slpg.document.file}
								lastUpdate={slpg.document.last_update}
							/>
						)}
						{slpn && (
							<DocumentCard
								title={slpn.document.title}
								file={slpn.document.file}
								lastUpdate={slpn.document.last_update}
							/>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<TopPoints />
					</CardContent>
				</Card>
			</div>

			{/* Center column */}
			<div className="space-y-6 lg:col-span-6">
				{pageContent && (
					<Card>
						<CardHeader>
							<CardTitle className="text-primary">{pageContent.title}</CardTitle>
						</CardHeader>
						<CardContent>
							<Markdown content={pageContent.content} />
						</CardContent>
					</Card>
				)}
				<Card>
					<CardHeader>
						<CardTitle className="text-primary">Points Breakdown by Event</CardTitle>
					</CardHeader>
					<CardContent>
						<PointsBreakdownTable />
					</CardContent>
				</Card>
			</div>

			{/* Right column */}
			<div className="lg:col-span-3">
				<DocumentList documents={filteredDocs} title="Past Seasons" />
			</div>
		</div>
	)
}
