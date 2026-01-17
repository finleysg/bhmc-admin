import { toast } from "react-toastify"

import { useEventDocumentSave } from "../../hooks/use-event-documents"
import { ClubEvent } from "../../models/club-event"
import { DocumentType } from "../../models/codes"
import { BhmcDocument } from "../../models/document"
import { ErrorDisplay } from "../feedback/error-display"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { DocumentUploadData, DocumentUploadForm } from "./document-upload-form"
import { DocumentView } from "./document-view"

interface EventDocumentEditorProps {
	document?: BhmcDocument | null
	clubEvent: ClubEvent
	onComplete: () => void
	onCancel: () => void
}

export function EventDocumentEditor({
	onComplete,
	onCancel,
	document,
	clubEvent,
}: EventDocumentEditorProps) {
	const { mutate: save, status, error } = useEventDocumentSave(clubEvent.id)

	const handleUpload = (values: DocumentUploadData, file?: File): Promise<void> => {
		const form = new FormData()
		form.append("document_type", values.document_type)
		form.append("event", clubEvent.id.toString())
		form.append("year", values.year.toString())
		form.append("title", values.title)
		if (file) {
			form.append("file", file, clubEvent.normalizeFilename(file.name))
		}

		return new Promise((resolve, reject) => {
			save(
				{
					formData: form,
					documentId: document?.id,
				},
				{
					onSuccess: () => {
						toast.success(`${values.title} has been saved.`)
						onComplete()
						resolve()
					},
					onError: (err) => {
						reject(err)
					},
				},
			)
		})
	}

	return (
		<div className="card">
			<div className="card-body">
				<OverlaySpinner loading={status === "pending"} />
				<h5 className="card-header mb-2">Upload Document</h5>
				{document && <DocumentView document={document} />}
				<DocumentUploadForm
					onSubmit={handleUpload}
					onCancel={onCancel}
					clubEvent={clubEvent}
					document={document}
					documentTypeFilter={[
						DocumentType.Flights,
						DocumentType.Other,
						DocumentType.Results,
						DocumentType.Teetimes,
						DocumentType.SignUp,
					]}
				/>
				{error && <ErrorDisplay error={error.message} delay={12000} onClose={() => void 0} />}
			</div>
		</div>
	)
}
