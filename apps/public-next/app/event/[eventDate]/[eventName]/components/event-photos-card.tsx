import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDjango } from "@/lib/fetchers"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import type { PhotoData } from "@/lib/types"

interface EventPhotosCardProps {
	tag: string
}

export async function EventPhotosCard({ tag }: EventPhotosCardProps) {
	let photos: PhotoData[] = []
	try {
		photos = await fetchDjango<PhotoData[]>(`/photos/random/?take=1&tag=${encodeURIComponent(tag)}`)
	} catch {
		return null
	}

	const photo = photos[0]
	if (!photo) {
		return null
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm text-primary">Photos</CardTitle>
			</CardHeader>
			<CardContent>
				<Link href={`/gallery?tag=${encodeURIComponent(tag)}`}>
					{/* eslint-disable-next-line @next/no-img-element */}
					<img
						src={resolvePhotoUrl(photo.mobile_url)}
						alt={photo.caption ?? "Event photo"}
						className="w-full rounded-md"
					/>
					{photo.caption && <p className="mt-1 text-xs text-muted-foreground">{photo.caption}</p>}
				</Link>
			</CardContent>
		</Card>
	)
}
