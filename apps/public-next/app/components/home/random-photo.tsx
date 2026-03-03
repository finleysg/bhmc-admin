import Image from "next/image"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import type { PhotoData } from "@/lib/types"

interface RandomPhotoProps {
	photo: PhotoData | undefined
}

export function RandomPhoto({ photo }: RandomPhotoProps) {
	if (!photo) return null

	return (
		<div>
			<Image
				src={resolvePhotoUrl(photo.mobile_url)}
				alt={photo.caption ?? "Club photo"}
				width={900}
				height={900}
				className="w-full max-h-[450px] rounded object-contain"
			/>
			<p className="mt-1 text-center text-sm text-muted-foreground">
				{photo.caption} (<strong>{photo.year}</strong>)
			</p>
		</div>
	)
}
