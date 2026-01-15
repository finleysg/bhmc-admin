import React, { ComponentPropsWithoutRef } from "react"

import { GoScreenFull } from "react-icons/go"
import { useNavigate } from "react-router-dom"

import { PhotoProps } from "../../models/photo"
import * as colors from "../../styles/colors"
import { isMobile, isSmall } from "../../styles/media-queries"
import { Dialog } from "../dialog/dialog"
import { GalleryImage } from "./gallery-image"

function OpenFullImage(props: ComponentPropsWithoutRef<"button">) {
	return (
		<div className="mt-1">
			<button className="photo-upload" {...props}>
				<GoScreenFull />
			</button>
		</div>
	)
}

export function SmallPhoto({ photo }: PhotoProps) {
	const [showFullImage, setShowFullImage] = React.useState(false)
	const navigate = useNavigate()

	const open = () => {
		if (isMobile() || isSmall()) {
			navigate(`/gallery/${photo.id}`)
		} else {
			setShowFullImage(true)
		}
	}

	return (
		<div className="photo-display">
			<img src={photo.mobileImageUrl()} alt={photo.caption} />
			<OpenFullImage onClick={open} color={colors.blue} />
			<Dialog show={showFullImage} onClose={() => setShowFullImage(false)}>
				<GalleryImage photo={photo} />
			</Dialog>
		</div>
	)
}
