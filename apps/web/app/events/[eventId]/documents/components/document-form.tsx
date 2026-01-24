"use client"

import { useState } from "react"
import { DOCUMENT_TYPES, type Document, type DocumentTypeCode } from "@repo/domain/types"
import { FormField } from "@/app/components/ui/form-field"
import { FilePicker } from "./file-picker"

export interface DocumentFormData {
	title: string
	documentType: DocumentTypeCode
	file?: File
}

interface DocumentFormProps {
	onSubmit: (data: DocumentFormData) => void | Promise<void>
	onCancel: () => void
	initialData?: Document
	isSubmitting: boolean
}

export function DocumentForm({ onSubmit, onCancel, initialData, isSubmitting }: DocumentFormProps) {
	const [title, setTitle] = useState(initialData?.title ?? "")
	const [documentType, setDocumentType] = useState<DocumentTypeCode>(
		initialData?.documentType ?? "O",
	)
	const [file, setFile] = useState<File | undefined>(undefined)
	const [errors, setErrors] = useState<{ title?: string; file?: string }>({})

	const isEditMode = !!initialData

	const validate = (): boolean => {
		const newErrors: { title?: string; file?: string } = {}

		if (!title.trim()) {
			newErrors.title = "Title is required"
		}

		if (!isEditMode && !file) {
			newErrors.file = "File is required"
		}

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!validate()) return

		void onSubmit({
			title: title.trim(),
			documentType,
			file,
		})
	}

	const currentFileName = initialData?.file ? initialData.file.split("/").pop() : undefined

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<FormField label="Title" error={errors.title}>
				<input
					type="text"
					id="title"
					className={`input input-bordered w-full ${errors.title ? "input-error" : ""}`}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					disabled={isSubmitting}
				/>
			</FormField>

			<FormField label="Document Type">
				<select
					id="documentType"
					className="select select-bordered w-full"
					value={documentType}
					onChange={(e) => setDocumentType(e.target.value as DocumentTypeCode)}
					disabled={isSubmitting}
				>
					{(Object.entries(DOCUMENT_TYPES) as [DocumentTypeCode, string][]).map(([code, label]) => (
						<option key={code} value={code}>
							{label}
						</option>
					))}
				</select>
			</FormField>

			<FormField label={`File${!isEditMode ? " *" : ""}`} error={errors.file}>
				<FilePicker onFileSelect={setFile} currentFileName={currentFileName} />
			</FormField>

			<div className="flex gap-2 justify-end pt-4">
				<button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
					Cancel
				</button>
				<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<span className="loading loading-spinner loading-sm"></span>
							{isEditMode ? "Saving..." : "Creating..."}
						</>
					) : isEditMode ? (
						"Save"
					) : (
						"Create"
					)}
				</button>
			</div>
		</form>
	)
}
