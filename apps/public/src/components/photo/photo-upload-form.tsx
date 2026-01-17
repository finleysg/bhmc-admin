import { FormEvent, useState } from "react"

import { z } from "zod"

import { formatZodErrors } from "../../utils/form-utils"
import { ErrorDisplay } from "../feedback/error-display"
import { InputControl } from "../forms/input-control"
import { PhotoPicker } from "./photo-picker"
import { TagPicker } from "./tag-picker"

const PhotoUploadSchema = z.object({
	year: z.number({ required_error: "The year/season is required." }),
	caption: z.string().min(1, "Enter a caption for this photo."),
	tags: z.array(z.string()).refine((value) => value.length > 0 && value[0].trim().length > 0, {
		message: "Select at least one tag to associate with this photo.",
	}),
})
export type PhotoUploadData = z.infer<typeof PhotoUploadSchema>

interface PhotoUploadFormProps {
	season?: number
	defaultTags: string[]
	error?: Error | null
	onSubmit: (values: PhotoUploadData, file: File, successCallback?: () => void) => void
}

export function PhotoUploadForm({ onSubmit, season, error, defaultTags }: PhotoUploadFormProps) {
	const [files, setFiles] = useState<File[]>([])
	const [formData, setFormData] = useState<PhotoUploadData>({
		year: season ?? new Date().getFullYear(),
		caption: "",
		tags: defaultTags,
	})
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleFileSelected = (selectedFiles: File[]) => {
		setFiles(selectedFiles)
	}

	const handleChange = (field: keyof PhotoUploadData, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		setErrors((prev) => ({ ...prev, [field]: "" }))
	}

	const handleTagChange = (tags: { tag: string }[]) => {
		setFormData((prev) => ({ ...prev, tags: tags.map((t) => t.tag) }))
		setErrors((prev) => ({ ...prev, tags: "" }))
	}

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault()
		const result = PhotoUploadSchema.safeParse(formData)
		if (!result.success) {
			setErrors(formatZodErrors(result.error))
			return
		}
		setIsSubmitting(true)
		onSubmit(result.data, files[0], () => {
			setFormData({ year: season ?? new Date().getFullYear(), caption: "", tags: defaultTags })
			setFiles([])
			setIsSubmitting(false)
		})
	}

	return (
		<div>
			<form onSubmit={handleSubmit}>
				<PhotoPicker onSelect={handleFileSelected} />
				<InputControl
					name="year"
					label="Year"
					type="text"
					value={formData.year}
					onChange={(e) => handleChange("year", parseInt(e.target.value) || 0)}
					error={errors.year}
				/>
				<InputControl
					name="caption"
					label="Caption"
					type="text"
					value={formData.caption}
					onChange={(e) => handleChange("caption", e.target.value)}
					error={errors.caption}
				/>
				<TagPicker defaultTags={defaultTags} onChange={handleTagChange} />
				{errors.tags && (
					<div
						className="invalid-feedback"
						style={{ display: "block" }}
						aria-errormessage={errors.tags}
					>
						{errors.tags}
					</div>
				)}
				<div className="d-flex justify-content-end">
					<button
						type="submit"
						className="btn btn-primary"
						disabled={files.length === 0 || isSubmitting}
					>
						Save
					</button>
				</div>
			</form>
			{error && <ErrorDisplay error={error.message} delay={10000} onClose={() => void 0} />}
		</div>
	)
}
