import { useState } from "react"

import { useForm } from "react-hook-form"
import { z } from "zod"

import { zodResolver } from "@hookform/resolvers/zod"

import { FilePicker } from "../document/file-picker"
import { InputControl } from "../forms/input-control"

const ImportPointsSchema = z.object({
	category: z.string().min(1, "Enter a category for this points file."),
})
type ImportPointsData = z.infer<typeof ImportPointsSchema>

interface ImportPointsFormProps {
	onSubmit: (category: string, file: File) => void
}

export function ImportPointsForm({ onSubmit }: ImportPointsFormProps) {
	const [refreshKey, setRefreshKey] = useState(0)
	const [files, setFiles] = useState<File[]>([])
	const form = useForm<ImportPointsData>({
		resolver: zodResolver(ImportPointsSchema),
	})
	const { reset, register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	const handleFileSelected = (files: File[]) => {
		setFiles(files)
	}

	const handleFileSubmit = (values: ImportPointsData) => {
		onSubmit(values.category, files[0])
		setFiles([])
		setRefreshKey(refreshKey + 1)
		reset()
	}

	return (
		<div>
			<form onSubmit={handleSubmit(handleFileSubmit)}>
				<InputControl
					name="category"
					label="Category"
					register={register("category")}
					error={formErrors.category}
					type="text"
				/>
				<FilePicker key={refreshKey} onSelected={handleFileSelected} onDrop={handleFileSelected} />
				<div className="d-flex justify-content-end mt-2">
					<button
						type="submit"
						className="btn btn-primary ms-2"
						disabled={files.length === 0 || isSubmitting}
					>
						Import Points
					</button>
				</div>
			</form>
		</div>
	)
}
