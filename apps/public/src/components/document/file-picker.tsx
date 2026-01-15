import { useMemo } from "react"

import { Accept, useDropzone } from "react-dropzone"

const baseStyle = {
	flex: 1,
	display: "flex",
	// flexDirection: "column" as const,
	alignItems: "center",
	justifyContent: "center",
	height: "150px",
	padding: "2rem",
	borderWidth: "4px",
	borderRadius: "4px",
	borderColor: "#6c757d",
	color: "#6c757d",
	borderStyle: "dashed",
	backgroundColor: "transparent",
	outline: "none",
	marginBottom: "1rem",
}

const focusedStyle = {
	borderColor: "#2196f3",
	color: "#2196f3",
}

const acceptStyle = {
	borderColor: "#00e676",
	color: "#00e676",
}

const rejectStyle = {
	borderColor: "#ff1744",
	color: "#ff1744",
}

interface FilePickerProps {
	accept?: Accept
	onDrop: (files: File[]) => void
	onSelected: (files: File[]) => void
}

export function FilePicker({ accept, onSelected }: FilePickerProps) {
	const {
		acceptedFiles,
		getRootProps,
		getInputProps,
		isDragActive,
		isDragAccept,
		isDragReject,
		isFocused,
	} = useDropzone({
		accept: accept,
		maxFiles: 1,
		multiple: false,
		onDrop: (acceptedFiles) => {
			onSelected(acceptedFiles)
		},
	})

	const style = useMemo(
		() => ({
			...baseStyle,
			...(isFocused ? focusedStyle : {}),
			...(isDragAccept ? acceptStyle : {}),
			...(isDragReject ? rejectStyle : {}),
		}),
		[isFocused, isDragAccept, isDragReject],
	)

	const files = acceptedFiles.map((file) => (
		<p key={file.name}>
			{file.name} - {file.size} bytes
		</p>
	))

	return (
		<section className="container">
			<div {...getRootProps({ style })}>
				<input {...getInputProps()} />
				{isDragActive ? (
					<div className="text-center">Drop the file here ...</div>
				) : (
					<div className="text-center">
						Drag and drop a file here, <br />
						or click to select a file
					</div>
				)}
			</div>
			<aside className="text-info text-center">
				<div>{files}</div>
			</aside>
		</section>
	)
}
