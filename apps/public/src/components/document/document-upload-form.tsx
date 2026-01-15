import { ChangeEvent, useState } from "react"

import { useForm } from "react-hook-form"
import { z } from "zod"

import { zodResolver } from "@hookform/resolvers/zod"

import { ClubEvent } from "../../models/club-event"
import { documentTypeMap } from "../../models/codes"
import { BhmcDocument } from "../../models/document"
import { currentSeason } from "../../utils/app-config"
import { InputControl } from "../forms/input-control"
import { SelectControl, SelectOption } from "../forms/select-control"
import { FilePicker } from "./file-picker"

const getDocumentTypeOptions = () => {
	const options: SelectOption[] = []
	documentTypeMap.forEach((value, key) => {
		options.push({ value: key, name: value })
	})
	return options
}

const DocumentUploadSchema = z.object({
	title: z.string().min(1, "A document title is required."),
	document_type: z.string().min(1, "Select a document type."),
	year: z.string({ required_error: "Associate the document with a season, or enter 0." }),
})
export type DocumentUploadData = z.infer<typeof DocumentUploadSchema>

interface DocumentUploadFormProps {
	clubEvent?: ClubEvent | null
	document?: BhmcDocument | null
	documentTypeFilter?: string[]
	onCancel: () => void
	onSubmit: (values: DocumentUploadData, file: File) => void
}

export function DocumentUploadForm({
	onCancel,
	onSubmit,
	clubEvent,
	document,
	documentTypeFilter,
}: DocumentUploadFormProps) {
	const [files, setFiles] = useState<File[]>([])
	const form = useForm<DocumentUploadData>({
		resolver: zodResolver(DocumentUploadSchema),
		defaultValues: {
			year: currentSeason.toString(),
			title: document?.title,
			document_type: document?.documentType,
		},
	})
	const { register, handleSubmit, formState } = form
	const { errors: formErrors, isSubmitting } = formState

	const documentTypeOptions = documentTypeFilter
		? getDocumentTypeOptions().filter((o) => documentTypeFilter.includes(o.value.toString()))
		: getDocumentTypeOptions()

	const handleFileSelected = (files: File[]) => {
		setFiles(files)
	}

	const handleFileSubmit = (values: DocumentUploadData) => {
		onSubmit(values, files[0])
	}

	const handleDocumentTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
		const code = e.target.value
		const { title } = form.getValues()
		if (clubEvent && (!title || title.trim().length === 0)) {
			const documentTypeName = documentTypeMap.get(code)?.replace("Event ", "")
			const title = `${clubEvent.name} ${documentTypeName}`
			form.setValue("title", title)
		}
	}

	return (
		<div>
			<form onSubmit={handleSubmit(handleFileSubmit)}>
				<SelectControl
					name="document_type"
					label="Type"
					register={register("document_type")}
					options={documentTypeOptions}
					error={formErrors.document_type}
					onChange={handleDocumentTypeChange}
				/>
				<InputControl
					name="year"
					label="Year"
					register={register("year")}
					error={formErrors.year}
					type="text"
				/>
				<InputControl
					name="title"
					label="Title"
					register={register("title")}
					error={formErrors.title}
					type="text"
				/>
				<FilePicker onSelected={handleFileSelected} onDrop={handleFileSelected} />
				<div className="d-flex justify-content-end">
					<button
						type="button"
						className="btn btn-light"
						disabled={isSubmitting}
						onClick={onCancel}
					>
						Cancel
					</button>
					<button
						type="submit"
						className="btn btn-primary ms-2"
						disabled={(!document && files.length === 0) || isSubmitting}
					>
						Save
					</button>
				</div>
			</form>
		</div>
	)
}
