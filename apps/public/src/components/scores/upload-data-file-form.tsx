import { ComponentPropsWithoutRef, FormEvent, useState } from "react"

import { FilePicker } from "../document/file-picker"

interface UploadDataFileFormProps extends Omit<ComponentPropsWithoutRef<"div">, "onSubmit"> {
	commandName: string
	onSubmit: (file: File) => void
}

export function UploadDataFileForm({ commandName, onSubmit, ...rest }: UploadDataFileFormProps) {
	const [refreshKey, setRefreshKey] = useState(0)
	const [files, setFiles] = useState<File[]>([])

	const handleFileSelected = (files: File[]) => {
		setFiles(files)
	}

	const handleFileSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		onSubmit(files[0])
		setFiles([])
		setRefreshKey(refreshKey + 1)
	}

	return (
		<div {...rest}>
			<form onSubmit={handleFileSubmit}>
				<FilePicker key={refreshKey} onSelected={handleFileSelected} onDrop={handleFileSelected} />
				<div className="d-flex justify-content-end mt-2">
					<button type="submit" className="btn btn-primary ms-2" disabled={files.length === 0}>
						{commandName}
					</button>
				</div>
			</form>
		</div>
	)
}
