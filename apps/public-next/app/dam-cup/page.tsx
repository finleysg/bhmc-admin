export const dynamic = "force-dynamic"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Markdown } from "@/components/markdown"
import { DocumentCard } from "@/components/document-card"
import { DocumentList } from "@/components/document-list"
import { fetchDjango } from "@/lib/fetchers"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import { currentSeason } from "@/lib/constants"
import type { DamCupResult, Document, PageContent, PhotoData, StaticDocument } from "@/lib/types"
import { DamCupResultsTable } from "./components/dam-cup-results-table"

export default async function DamCupPage() {
	const [pageContentArr, results, cupDocs, historicalDocs, photos] = await Promise.all([
		fetchDjango<PageContent[]>("/page-content/?key=dam-cup", { revalidate: 3600 }),
		fetchDjango<DamCupResult[]>("/dam-cup/", { revalidate: 3600 }),
		fetchDjango<StaticDocument[]>("/static-documents/?code=CUP").catch(() => []),
		fetchDjango<Document[]>("/documents/?type=D", { revalidate: 3600 }),
		fetchDjango<PhotoData[]>("/photos/random/?take=2&tag=Dam%20Cup").catch(() => []),
	])

	const pageContent = pageContentArr[0]
	const cupDoc = cupDocs[0]
	const filteredDocs = historicalDocs.filter((d) => d.year !== currentSeason)

	return (
		<div className="grid gap-6 lg:grid-cols-12">
			{/* Left column */}
			<div className="space-y-6 lg:col-span-3">
				{cupDoc && (
					<Card>
						<CardHeader>
							<CardTitle className="text-primary">Current Standings</CardTitle>
						</CardHeader>
						<CardContent>
							<DocumentCard
								title={cupDoc.document.title}
								file={cupDoc.document.file}
								lastUpdate={cupDoc.document.last_update}
							/>
						</CardContent>
					</Card>
				)}
				<Card>
					<CardHeader>
						<CardTitle className="text-primary">Past Results</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Image
							src="/images/DamCup.png"
							alt="Dam Cup Logo"
							width={400}
							height={400}
							className="w-full h-auto"
						/>
						<DamCupResultsTable results={results} initialCount={6} />
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
				{photos.length > 0 && (
					<Card>
						<CardContent className="space-y-4 pt-6">
							<div className="grid gap-4 sm:grid-cols-2">
								{photos.map((photo) => (
									<div key={photo.id}>
										{/* eslint-disable-next-line @next/no-img-element */}
										<img
											src={resolvePhotoUrl(photo.mobile_url)}
											alt={photo.caption ?? "Dam Cup photo"}
											className="w-full rounded-md"
										/>
										{photo.caption && (
											<p className="mt-1 text-xs text-muted-foreground">{photo.caption}</p>
										)}
									</div>
								))}
							</div>
							<Link href="/gallery?tag=Dam Cup" className="text-sm text-primary underline">
								Go to the Dam Cup photo gallery
							</Link>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Right column */}
			<div className="lg:col-span-3">
				<DocumentList documents={filteredDocs} title="Past Seasons" initialCount={10} />
			</div>
		</div>
	)
}
