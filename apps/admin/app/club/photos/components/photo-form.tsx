"use client"

import { useEffect, useState } from "react"
import type { Tag } from "@repo/domain/types"
import { FormField } from "@/app/components/ui/form-field"
import { ImagePicker } from "./image-picker"
import { TagSelect } from "./tag-select"

interface PhotoFormProps {
	tags: Tag[]
	onSubmit: (formData: FormData) => void | Promise<void>
	isSubmitting: boolean
	resetKey?: number
}

interface FormErrors {
	caption?: string
	tags?: string
	image?: string
}

export function PhotoForm({ tags, onSubmit, isSubmitting, resetKey = 0 }: PhotoFormProps) {
	const [caption, setCaption] = useState("")
	const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
	const [file, setFile] = useState<File | null>(null)
	const [errors, setErrors] = useState<FormErrors>({})

	const maxCaptionLength = 240

	useEffect(() => {
		if (resetKey > 0) {
			setCaption("")
			setSelectedTagIds([])
			setFile(null)
			setErrors({})
		}
	}, [resetKey])

	const validate = (): boolean => {
		const newErrors: FormErrors = {}

		if (!caption.trim()) {
			newErrors.caption = "Caption is required"
		} else if (caption.length > maxCaptionLength) {
			newErrors.caption = `Caption must be ${maxCaptionLength} characters or less`
		}

		if (selectedTagIds.length === 0) {
			newErrors.tags = "At least one tag is required"
		}

		if (!file) {
			newErrors.image = "Image is required"
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!validate()) return

		const formData = new FormData()
		formData.append("year", new Date().getFullYear().toString())
		formData.append("caption", caption.trim())
		formData.append("raw_image", file!)

		const tagNames = selectedTagIds
			.map((id) => tags.find((t) => t.id === id)?.name)
			.filter(Boolean)
			.join("|")
		formData.append("tags", tagNames)

		void onSubmit(formData)
	}

	const resetForm = () => {
		setCaption("")
		setSelectedTagIds([])
		setFile(null)
		setErrors({})
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FormField label="Caption *" error={errors.caption}>
				<div className="relative">
					<input
						type="text"
						className={`input input-bordered w-full ${errors.caption ? "input-error" : ""}`}
						value={caption}
						onChange={(e) => setCaption(e.target.value)}
						disabled={isSubmitting}
						maxLength={maxCaptionLength}
						placeholder="Enter a caption for the photo"
					/>
					<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-base-content/50">
						{caption.length}/{maxCaptionLength}
					</span>
				</div>
			</FormField>

			<TagSelect
				tags={tags}
				selectedTagIds={selectedTagIds}
				onChange={setSelectedTagIds}
				error={errors.tags ?? null}
			/>

			<FormField label="Image *" error={errors.image}>
				<ImagePicker onFileSelect={setFile} file={file} />
			</FormField>

			<div className="flex gap-2 justify-end pt-4">
				<button type="button" className="btn btn-ghost" onClick={resetForm} disabled={isSubmitting}>
					Clear
				</button>
				<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<span className="loading loading-spinner loading-sm"></span>
							Uploading...
						</>
					) : (
						"Upload Photo"
					)}
				</button>
			</div>
		</form>
	)
}
