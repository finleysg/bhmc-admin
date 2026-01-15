import { useState } from "react"

import { useForm } from "react-hook-form"
import { z } from "zod"

import { zodResolver } from "@hookform/resolvers/zod"

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

	const form = useForm<PhotoUploadData>({
		resolver: zodResolver(PhotoUploadSchema),
		defaultValues: {
			year: season,
			tags: defaultTags,
		},
	})
	const { register, reset, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	const handleFileSelected = (files: File[]) => {
		setFiles(files)
	}

	const handleFileSubmit = (values: PhotoUploadData) => {
		onSubmit(values, files[0], () => {
			reset()
			setFiles([])
		})
	}

	return (
		<div>
			<form onSubmit={handleSubmit(handleFileSubmit)}>
				<PhotoPicker onSelect={handleFileSelected} />
				<InputControl
					name="year"
					label="Year"
					register={register("year")}
					error={formErrors.year}
					type="text"
				/>
				<InputControl
					name="caption"
					label="Caption"
					register={register("caption")}
					error={formErrors.caption}
					type="text"
				/>
				<TagPicker
					defaultTags={defaultTags}
					onChange={(tags) => {
						form.setValue(
							"tags",
							tags.map((t) => t.tag),
						)
						form.clearErrors("tags")
					}}
				/>
				{formErrors.tags && (
					<div
						className="invalid-feedback"
						style={{ display: "block" }}
						aria-errormessage={formErrors.tags.message}
					>
						{formErrors.tags.message as string}
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
