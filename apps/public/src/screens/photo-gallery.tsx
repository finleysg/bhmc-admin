import { useLocation } from "react-router-dom"

import { PhotoGallery } from "../components/photo/photo-gallery"

export function PhotoGalleryScreen() {
	const { search } = useLocation()

	let tag
	let title = "Photo Gallery"

	if (search) {
		const arg = new URLSearchParams(search).get("tag")
		if (arg) {
			title = arg + " Photo Callery"
			tag = arg
		}
	}

	return (
		<div className="content__inner">
			<h3 className="text-primary">{title}</h3>
			<PhotoGallery tag={tag} />
		</div>
	)
}
