import { useState } from "react"

import { toast } from "react-toastify"

import { useUploadPhoto } from "../../hooks/use-photo"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { PhotoUploadData, PhotoUploadForm } from "./photo-upload-form"

interface PhotoUploaderProps {
	season?: number
	defaultTags: string[]
}

export function PhotoUploader({ season, defaultTags }: PhotoUploaderProps) {
	const { mutate: savePhoto, status, error } = useUploadPhoto()
	const [photoKey, setPhotoKey] = useState(Date.now().toString())

	const handleSave = (values: PhotoUploadData, file: File, successCallback?: () => void) => {
		const form = new FormData()
		form.append("year", values.year.toString())
		form.append("caption", values.caption ?? "")
		form.append("tags", values.tags?.map((tag) => tag).join("|") ?? "")
		form.append("raw_image", file, file.name)

		savePhoto(form, {
			onSuccess: () => {
				toast.success("Your photo has been uploaded.")
				successCallback?.()
				setPhotoKey(Date.now().toString())
			},
		})
	}

	return (
		<div className="card">
			<OverlaySpinner loading={status === "pending"} />
			<div className="card-body">
				<h4 className="card-header mb-4">Upload a Photo</h4>
				<PhotoUploadForm
					key={photoKey}
					season={season}
					defaultTags={[...defaultTags]}
					error={error}
					onSubmit={handleSave}
				/>
			</div>
		</div>
	)
}
