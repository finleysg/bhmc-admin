/* eslint-disable @next/no-img-element */
"use client"

import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"

interface ImagePickerProps {
	onFileSelect: (file: File | null) => void
	file: File | null
}

export function ImagePicker({ onFileSelect, file }: ImagePickerProps) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)

	useEffect(() => {
		if (file) {
			const url = URL.createObjectURL(file)
			setPreviewUrl(url)
			return () => URL.revokeObjectURL(url)
		} else {
			setPreviewUrl(null)
		}
	}, [file])

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				onFileSelect(acceptedFiles[0])
			}
		},
		[onFileSelect],
	)

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: {
			"image/jpeg": [".jpg", ".jpeg"],
			"image/png": [".png"],
			"image/gif": [".gif"],
		},
	})

	return (
		<div className="form-control">
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
					isDragActive ? "border-primary bg-primary/10" : "border-base-300 hover:border-primary"
				}`}
			>
				<input {...getInputProps()} />
				{previewUrl ? (
					<div className="flex flex-col items-center gap-2">
						<img
							src={previewUrl}
							alt="Preview"
							className="max-h-48 max-w-full object-contain rounded"
						/>
						<p className="text-sm text-base-content/70">Click or drag to replace</p>
					</div>
				) : (
					<div>
						{isDragActive ? (
							<p>Drop the image here...</p>
						) : (
							<>
								<p>Drag and drop an image here, or click to select</p>
								<p className="text-sm text-base-content/70 mt-1">Accepts JPEG, PNG, and GIF</p>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
