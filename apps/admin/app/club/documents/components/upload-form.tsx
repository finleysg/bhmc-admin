"use client"

import { useState } from "react"
import {
	DOCUMENT_TYPES,
	type ClubDocumentCode,
	type Document,
	type DocumentTypeCode,
} from "@repo/domain/types"
import { FormField } from "@/app/components/ui/form-field"
import { FilePicker } from "@/app/events/[eventId]/documents/components/file-picker"

export interface UploadFormData {
	title: string
	documentType: DocumentTypeCode
	year: number
	file?: File
}

interface UploadFormProps {
	code: ClubDocumentCode
	onSubmit: (data: UploadFormData) => void | Promise<void>
	onCancel: () => void
	isSubmitting: boolean
	existingDocument?: Document
}

export function UploadForm({
	code,
	onSubmit,
	onCancel,
	isSubmitting,
	existingDocument,
}: UploadFormProps) {
	const currentYear = new Date().getFullYear()
	const [title, setTitle] = useState(existingDocument?.title ?? code.displayName)
	const [documentType, setDocumentType] = useState<DocumentTypeCode>(
		existingDocument?.documentType ?? "O",
	)
	const [year, setYear] = useState(existingDocument?.year ?? currentYear)
	const [file, setFile] = useState<File | undefined>(undefined)
	const [errors, setErrors] = useState<{ title?: string; file?: string }>({})

	const isReplaceMode = !!existingDocument

	const validate = (): boolean => {
		const newErrors: { title?: string; file?: string } = {}

		if (!title.trim()) {
			newErrors.title = "Title is required"
		}

		if (!isReplaceMode && !file) {
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
			year,
			file,
		})
	}

	const currentFileName = existingDocument?.file
		? existingDocument.file.split("/").pop()
		: undefined

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
					{(Object.entries(DOCUMENT_TYPES) as [DocumentTypeCode, string][]).map(
						([typeCode, label]) => (
							<option key={typeCode} value={typeCode}>
								{label}
							</option>
						),
					)}
				</select>
			</FormField>

			<FormField label="Year">
				<input
					type="number"
					id="year"
					className="input input-bordered w-full"
					value={year}
					onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
					disabled={isSubmitting}
					min={2000}
					max={2100}
				/>
			</FormField>

			<FormField label={`File${!isReplaceMode ? " *" : ""}`} error={errors.file}>
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
							{isReplaceMode ? "Replacing..." : "Uploading..."}
						</>
					) : isReplaceMode ? (
						"Replace"
					) : (
						"Upload"
					)}
				</button>
			</div>
		</form>
	)
}
