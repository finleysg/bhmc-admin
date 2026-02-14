export const dynamic = "force-dynamic"

import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Markdown } from "@/components/markdown"
import { fetchDjango } from "@/lib/fetchers"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import type { PageContent, PhotoData } from "@/lib/types"

export default async function AboutPage() {
	const [contentArr, photos] = await Promise.all([
		fetchDjango<PageContent[]>("/page-content/?key=about-us"),
		fetchDjango<PhotoData[]>("/photos/random/?take=3"),
	])

	const content = contentArr[0]

	return (
		<div className="grid gap-6 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>{content?.title ?? "About Us"}</CardTitle>
				</CardHeader>
				<CardContent>
					<Markdown content={content?.content} />
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle className="text-green-600 dark:text-green-400">
						Serious Golf, Serious Fun
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{photos.map((photo) => (
						<div key={photo.id}>
							<Image
								src={resolvePhotoUrl(photo.mobile_url)}
								alt={photo.caption ?? "Club photo"}
								width={900}
								height={900}
								className="w-full rounded"
							/>
							<p className="mt-1 text-sm text-muted-foreground">
								{photo.caption} (<strong>{photo.year}</strong>)
							</p>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	)
}
