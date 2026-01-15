import { useClubDocumentEdit } from "../../hooks/use-club-documents"
import { DocumentType, getClubDocumentName } from "../../models/codes"
import { ClubDocument } from "../../models/document"
import { ErrorDisplay } from "../feedback/error-display"
import { OverlaySpinner } from "../spinners/overlay-spinner"
import { DocumentUploadData, DocumentUploadForm } from "./document-upload-form"
import { DocumentView } from "./document-view"

interface ClubDocumentEditorProps {
	code: string
	document?: ClubDocument
	onCancel: () => void
	onComplete: () => void
}

export function ClubDocumentEditor({
	onCancel,
	onComplete,
	document,
	code,
}: ClubDocumentEditorProps) {
	const { handleUpload, isBusy, error } = useClubDocumentEdit(code)

	const saveHandler = async (values: DocumentUploadData, file: File) => {
		await handleUpload(document ?? null, values, file)
		onComplete()
	}

	return (
		<div className="card">
			<OverlaySpinner loading={isBusy} />
			<div className="card-body">
				<h5 className="card-header mb-2">Upload {getClubDocumentName(code)}</h5>
				{document && <DocumentView document={document.document} />}
				<DocumentUploadForm
					onSubmit={saveHandler}
					onCancel={onCancel}
					document={document?.document}
					documentTypeFilter={[
						DocumentType.DamCup,
						DocumentType.Finance,
						DocumentType.MatchPlay,
						DocumentType.Other,
						DocumentType.Points,
					]}
				/>
				{error && <ErrorDisplay error={error.message} delay={12000} onClose={() => void 0} />}
			</div>
		</div>
	)
}
