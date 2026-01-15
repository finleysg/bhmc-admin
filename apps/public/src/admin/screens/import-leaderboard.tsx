import { useState } from "react"

import { toast } from "react-toastify"

import { CardContent } from "../../components/card/content"
import { ErrorDisplay } from "../../components/feedback/error-display"
import { UploadDataFileForm } from "../../components/scores/upload-data-file-form"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useEventDocumentSave } from "../../hooks/use-event-documents"
import { useImportLowScores } from "../../hooks/use-import-lowscores"
import { useImportPoints } from "../../hooks/use-import-points"
import { useImportScores } from "../../hooks/use-import-scores"
import { DocumentType } from "../../models/codes"
import { useEventAdmin } from "../layout/event-admin"

export function ImportLeaderboardScreen() {
	const { clubEvent } = useEventAdmin()
	const [importFailures, setImportFailures] = useState<string[]>([])
	const [dataDocument, setDataDocument] = useState({ id: 0, title: "" })

	const {
		mutateAsync: uploadFile,
		status: uploadStatus,
		error: uploadError,
	} = useEventDocumentSave(clubEvent.id)
	const { mutateAsync: importPoints, status: pointsStatus, error: pointsError } = useImportPoints()
	const { mutateAsync: importScores, status: scoresStatus, error: scoresError } = useImportScores()
	const {
		mutateAsync: importLowScores,
		status: lowScoresStatus,
		error: lowScoresError,
	} = useImportLowScores()

	const handleUpload = async (file: File) => {
		setImportFailures([])

		const form = new FormData()
		form.append("document_type", DocumentType.Data)
		form.append("event", clubEvent.id.toString())
		form.append("year", clubEvent.season.toString())
		form.append("title", `${clubEvent.name} Leaderboard`)
		form.append("file", file, clubEvent.normalizeFilename(file.name))

		const dataDocument = await uploadFile({ formData: form })
		setDataDocument(dataDocument)
		toast.success("Leaderboard file has been uploaded")
	}

	const handleImportPoints = async () => {
		setImportFailures([])
		const results = await importPoints({ eventId: clubEvent.id, documentId: dataDocument.id })
		if (results && results.length > 0) {
			setImportFailures(results)
		}
		toast.success("Points imported successfully")
	}

	const handleImportScores = async () => {
		setImportFailures([])
		const results = await importScores({ eventId: clubEvent.id, documentId: dataDocument.id })
		if (results && results.length > 0) {
			setImportFailures(results)
		}
		toast.success("Scores imported successfully")
	}

	const handleImportLowScores = async () => {
		setImportFailures([])
		const results = await importLowScores({ eventId: clubEvent.id, documentId: dataDocument.id })
		if (results && results.length > 0) {
			setImportFailures(results)
		}
		toast.success("Low scores imported successfully")
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12">
				<CardContent contentKey="import-scores">
					<>
						<OverlaySpinner
							loading={
								uploadStatus === "pending" ||
								pointsStatus === "pending" ||
								scoresStatus === "pending" ||
								lowScoresStatus === "pending"
							}
						/>
						<UploadDataFileForm commandName="Upload Leaderboard" onSubmit={handleUpload} />
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
						<button
							type="button"
							className="btn btn-primary ms-2 me-2"
							onClick={handleImportScores}
							disabled={scoresStatus === "pending"}
						>
							Import Scores
						</button>
						<button
							type="button"
							className="btn btn-primary ms-2 me-2"
							onClick={handleImportLowScores}
							disabled={lowScoresStatus === "pending"}
						>
							Import Low Scores
						</button>
					</div>
				)}
				<>
					{pointsError && (
						<ErrorDisplay error={pointsError.message} delay={5000} onClose={() => void 0} />
					)}
					{scoresError && (
						<ErrorDisplay error={scoresError.message} delay={5000} onClose={() => void 0} />
					)}
					{lowScoresError && (
						<ErrorDisplay error={lowScoresError.message} delay={5000} onClose={() => void 0} />
					)}
				</>
				{importFailures.length > 0 && (
					<CardContent contentKey="import-scores-fail">
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
