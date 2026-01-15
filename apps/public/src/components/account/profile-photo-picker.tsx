import { useState } from "react"

import { MdCameraAlt } from "react-icons/md"

import { CloseableProps } from "../../models/common-props"
import { PhotoPicker } from "../photo/photo-picker"

interface ProfilePhotoPickerProps {
	onSelect: (file: File) => void
}

export function ProfilePhotoPicker({
	onClose,
	onSelect,
}: ProfilePhotoPickerProps & CloseableProps) {
	const [pic, setPic] = useState<File | null>(null)

	return (
		<div className="pmb-block">
			<div className="pmbb-header">
				<h2>
					<MdCameraAlt /> Upload Profile Picture
				</h2>
			</div>
			<PhotoPicker onSelect={(files) => setPic(files[0])} />
			<button
				className="btn btn-primary btn-sm me-2"
				onClick={() => onSelect(pic!)}
				disabled={!pic}
			>
				Save
			</button>
			<button className="btn btn-light btn-sm" onClick={onClose}>
				Cancel
			</button>
		</div>
	)
}
