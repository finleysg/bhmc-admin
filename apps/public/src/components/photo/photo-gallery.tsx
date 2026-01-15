import { useState } from "react"

import { usePagingData } from "../../hooks/use-paging-data"
import { Photo, PhotoApiSchema } from "../../models/photo"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { SmallPhoto } from "./small-photo"

interface PhotoGalleryProps {
	tag?: string
}

export function PhotoGallery({ tag }: PhotoGalleryProps) {
	const [page, setPage] = useState(1)
	const [photos, setPhotos] = useState<Photo[]>([])

	const url = () => {
		if (tag) {
			return `photos/?page=${page}&tags=${tag}`
		} else {
			return `photos/?page=${page}`
		}
	}
	const { data, status } = usePagingData(url(), PhotoApiSchema)

	console.log("results length: " + data?.results?.length)
	console.log("page: " + page)
	console.log("photos length: " + photos.length)

	if (data?.results && (data?.results?.length ?? 0) * page > photos.length) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		setPhotos([...photos, ...data.results.map((pic: any) => new Photo(pic))])
	}

	const handleLoadMore = () => {
		setPage(page + 1)
	}

	return (
		<div>
			<OverlaySpinner loading={status === "pending"} />
			<ul style={{ listStyle: "none" }}>
				{photos.map((pic) => {
					return (
						<li key={pic.id} style={{ display: "inline-block" }}>
							<SmallPhoto photo={pic} />
						</li>
					)
				})}
				{data?.next && (
					<li>
						<button className="btn btn-link" onClick={handleLoadMore}>
							load more...
						</button>
					</li>
				)}
			</ul>
		</div>
	)
}
