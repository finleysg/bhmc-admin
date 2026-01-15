import { useParams } from "react-router-dom"

import { GalleryImage } from "../components/photo/gallery-image"
import { LoadingSpinner } from "../components/spinners/loading-spinner"
import { usePhoto } from "../hooks/use-photo"

export function GalleryImageScreen() {
	const { id } = useParams()
	const { data: pic, status } = usePhoto(id ? +id : 0)

	return (
		<div className="content__inner">
			<LoadingSpinner loading={status === "pending"} paddingTop="100px" />
			{pic && <GalleryImage photo={pic} />}
		</div>
	)
}
