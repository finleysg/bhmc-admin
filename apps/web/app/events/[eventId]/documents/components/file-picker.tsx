"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"

interface FilePickerProps {
	onFileSelect: (file: File) => void
	currentFileName?: string
}

export function FilePicker({ onFileSelect, currentFileName }: FilePickerProps) {
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				onFileSelect(acceptedFiles[0])
			}
		},
		[onFileSelect],
	)

	const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
		onDrop,
		multiple: false,
	})

	const selectedFile = acceptedFiles[0]

	return (
		<div className="form-control">
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
					isDragActive ? "border-primary bg-primary/10" : "border-base-300 hover:border-primary"
				}`}
			>
				<input {...getInputProps()} />
				{selectedFile ? (
					<div>
						<p className="font-medium">{selectedFile.name}</p>
						<p className="text-sm text-base-content/60">Click or drag to replace</p>
					</div>
				) : currentFileName ? (
					<div>
						<p className="text-sm text-base-content/60">Current file:</p>
						<p className="font-medium">{currentFileName}</p>
						<p className="text-sm text-base-content/60 mt-2">Drop a file or click to replace</p>
					</div>
				) : (
					<div>
						{isDragActive ? (
							<p>Drop the file here...</p>
						) : (
							<>
								<p>Drag and drop a file here, or click to select</p>
								<p className="text-sm text-base-content/60 mt-1">Any file type accepted</p>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
