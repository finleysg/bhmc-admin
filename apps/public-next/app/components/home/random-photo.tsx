import { resolvePhotoUrl } from "@/lib/photo-utils"
import type { PhotoData } from "@/lib/types"

interface RandomPhotoProps {
	photo: PhotoData | undefined
}

export function RandomPhoto({ photo }: RandomPhotoProps) {
	if (!photo) return null

	return (
		<div>
			{/* eslint-disable-next-line @next/no-img-element */}
			<img
				src={resolvePhotoUrl(photo.mobile_url)}
				alt={photo.caption ?? "Club photo"}
				className="w-full rounded"
			/>
			<p className="mt-1 text-sm text-muted-foreground">
				{photo.caption} (<strong>{photo.year}</strong>)
			</p>
		</div>
	)
}
