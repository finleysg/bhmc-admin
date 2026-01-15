import React from "react"

import { FileWithPath } from "react-dropzone"

import { FilePicker } from "../document/file-picker"

interface PhotoPickerProps {
	onSelect: (file: File[]) => void
}

interface FileWithPreview extends FileWithPath {
	preview: string
}

export function PhotoPicker({ onSelect }: PhotoPickerProps) {
	const [files, setFiles] = React.useState<FileWithPreview[]>([])

	React.useEffect(
		() => () => {
			// Make sure to revoke the data uris to avoid memory leaks
			files.forEach((file) => {
				if (file.preview) {
					URL.revokeObjectURL(file.preview)
				}
			})
		},
		[files],
	)

	const preview = (acceptedFiles: File[]) => {
		onSelect(acceptedFiles)
		setFiles(
			acceptedFiles.map((file) =>
				Object.assign(file, {
					preview: URL.createObjectURL(file),
				}),
			),
		)
	}

	const thumbs = files.map((file) => (
		<div className="thumb" key={file.name}>
			<div className="thumb-inner">
				<img className="thumb-preview" src={file.preview} alt="preview" />
			</div>
		</div>
	))

	return (
		<div>
			<FilePicker
				onSelected={preview}
				onDrop={preview}
				accept={{
					"image/gif": [".gif"],
					"image/jpeg": [".jpg", ".jpeg"],
					"image/png": [".png"],
				}}
			/>
			<aside className="thumb-container">{thumbs}</aside>
		</div>
	)
}
