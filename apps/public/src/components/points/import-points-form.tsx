import { FormEvent, useState } from "react"

import { z } from "zod"

import { formatZodErrors } from "../../utils/form-utils"
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
	const [formData, setFormData] = useState<ImportPointsData>({ category: "" })
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleFileSelected = (selectedFiles: File[]) => {
		setFiles(selectedFiles)
	}

	const handleChange = (field: keyof ImportPointsData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = ImportPointsSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		onSubmit(result.data.category, files[0])
		setFiles([])
		setRefreshKey(refreshKey + 1)
		setFormData({ category: "" })
		setIsSubmitting(false)
	}

	return (
		<div>
			<form onSubmit={handleSubmit}>
				<InputControl
					name="category"
					label="Category"
					type="text"
					value={formData.category}
					onChange={(e) => handleChange("category", e.target.value)}
					error={errors.category}
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
