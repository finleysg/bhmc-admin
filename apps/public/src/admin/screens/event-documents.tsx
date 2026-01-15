import { useState } from "react"

import { CardContent } from "../../components/card/content"
import { ConfirmDialog } from "../../components/dialog/confirm"
import { EventDocumentEditor } from "../../components/document/event-document-editor"
import { EventDocumentTable } from "../../components/document/event-document-table"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useEventDocumentDelete, useEventDocuments } from "../../hooks/use-event-documents"
import { BhmcDocument } from "../../models/document"
import { useEventAdmin } from "../layout/event-admin"

export function EventDocumentsScreen() {
	const { clubEvent } = useEventAdmin()
	const { data: docs, status } = useEventDocuments(clubEvent.id)
	const { mutate: deleteDocument, status: deleteStatus } = useEventDocumentDelete(clubEvent.id)
	const [currentDocument, setCurrentDocument] = useState<BhmcDocument | null>(null)
	const [showEditor, setShowEditor] = useState(false)
	const [showConfirmDelete, setShowConfirmDelete] = useState(false)

	const handleEdit = (doc: BhmcDocument) => {
		setCurrentDocument(doc)
		setShowEditor(true)
	}

	const handleDelete = (doc: BhmcDocument) => {
		setCurrentDocument(doc)
		setShowConfirmDelete(true)
	}

	const handleDeleteConfirm = (decision: boolean) => {
		if (decision && currentDocument) {
			deleteDocument(currentDocument?.id)
		}
		setShowConfirmDelete(false)
	}

	const handleNew = () => {
		setCurrentDocument(null)
		setShowEditor(true)
	}

	const handleComplete = () => {
		setCurrentDocument(null)
		setShowEditor(false)
	}

	const handleCancel = () => {
		setCurrentDocument(null)
		setShowEditor(false)
	}

	return (
		<div className="row">
			<div className="col-lg-6 col-md-8 col-sm-12 offset-lg-3 offset-md-2">
				<OverlaySpinner loading={status === "pending" || deleteStatus === "pending"} />
				<CardContent contentKey="event-documents">
					<>
						<EventDocumentTable
							documents={docs ?? []}
							onDelete={handleDelete}
							onUpdate={handleEdit}
						/>
						<div className="d-flex justify-content-end mt-4">
							<button className="btn btn-primary btn-sm" onClick={handleNew}>
								Upload New
							</button>
						</div>
					</>
				</CardContent>
				{showEditor && (
					<EventDocumentEditor
						clubEvent={clubEvent}
						document={currentDocument}
						onCancel={handleCancel}
						onComplete={handleComplete}
					/>
				)}
				<ConfirmDialog
					show={showConfirmDelete}
					message={`Delete the document ${currentDocument?.title}?`}
					onClose={handleDeleteConfirm}
				/>
			</div>
		</div>
	)
}
