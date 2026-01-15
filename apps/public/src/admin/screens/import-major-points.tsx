import { useState } from "react"

import { toast } from "react-toastify"

import { CardContent } from "../../components/card/content"
import { ErrorDisplay } from "../../components/feedback/error-display"
import { UploadDataFileForm } from "../../components/scores/upload-data-file-form"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useEventDocumentSave } from "../../hooks/use-event-documents"
import { useImportMajorPoints } from "../../hooks/use-import-points"
import { DocumentType } from "../../models/codes"
import { useEventAdmin } from "../layout/event-admin"

export function ImportMajorPointsScreen() {
	const { clubEvent } = useEventAdmin()
	const [importFailures, setImportFailures] = useState<string[]>([])
	const [dataDocument, setDataDocument] = useState({ id: 0, title: "" })

	const {
		mutateAsync: uploadFile,
		status: uploadStatus,
		error: uploadError,
	} = useEventDocumentSave(clubEvent.id)
	const {
		mutateAsync: importPoints,
		status: pointsStatus,
		error: pointsError,
	} = useImportMajorPoints()

	const handleUpload = async (file: File) => {
		setImportFailures([])

		const form = new FormData()
		form.append("document_type", DocumentType.Data)
		form.append("event", clubEvent.id.toString())
		form.append("year", clubEvent.season.toString())
		form.append("title", `${clubEvent.name} Points`)
		form.append("file", file, clubEvent.normalizeFilename(file.name))

		const dataDocument = await uploadFile({ formData: form })
		setDataDocument(dataDocument)
		toast.success("Points file has been uploaded")
	}

	const handleImportPoints = async () => {
		setImportFailures([])
		const results = await importPoints({ eventId: clubEvent.id, documentId: dataDocument.id })
		if (results && results.length > 0) {
			setImportFailures(results)
		}
		toast.success("Points imported successfully")
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12">
				<CardContent contentKey="import-scores">
					<>
						<OverlaySpinner loading={uploadStatus === "pending" || pointsStatus === "pending"} />
						<UploadDataFileForm commandName="Upload Points" onSubmit={handleUpload} />
						{uploadError && (
							<ErrorDisplay error={uploadError.message} delay={5000} onClose={() => void 0} />
						)}
					</>
				</CardContent>
			</div>
			<div className="col-lg-4 col-md-6 col-sm-12">
				{dataDocument.id > 0 && (
					<div className="d-flex justify-content-center mb-4">
						<button
							type="button"
							className="btn btn-primary ms-2 me-2"
							onClick={handleImportPoints}
							disabled={pointsStatus === "pending"}
						>
							Import Points
						</button>
					</div>
				)}
				<>
					{pointsError && (
						<ErrorDisplay error={pointsError.message} delay={5000} onClose={() => void 0} />
					)}
				</>
				{importFailures.length > 0 && (
					<CardContent contentKey="import-points-fail">
						<ul>
							{importFailures.map((message) => {
								return <li key={message}>{message}</li>
							})}
						</ul>
					</CardContent>
				)}
			</div>
		</div>
	)
}
