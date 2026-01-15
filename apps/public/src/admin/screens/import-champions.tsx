import { useState } from "react"

import { toast } from "react-toastify"

import { CardContent } from "../../components/card/content"
import { ErrorDisplay } from "../../components/feedback/error-display"
import { ChampionList } from "../../components/results/champion-list"
import { UploadDataFileForm } from "../../components/scores/upload-data-file-form"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useEventDocumentSave } from "../../hooks/use-event-documents"
import { useImportChampions } from "../../hooks/use-import-champions"
import { useEventChampions } from "../../hooks/use-major-champions"
import { DocumentType } from "../../models/codes"
import { useEventAdmin } from "../layout/event-admin"

export function ImportChampionsScreen() {
	const { clubEvent } = useEventAdmin()
	const [importFailures, setImportFailures] = useState<string[]>([])
	const { data: champions, status } = useEventChampions(clubEvent)
	const {
		mutateAsync: uploadFile,
		status: uploadStatus,
		error: uploadError,
	} = useEventDocumentSave(clubEvent.id)
	const { mutateAsync: importData, status: importStatus, error: importError } = useImportChampions()

	const handleUpload = async (file: File) => {
		setImportFailures([])

		const form = new FormData()
		form.append("document_type", DocumentType.Data)
		form.append("event", clubEvent.id.toString())
		form.append("year", clubEvent.season.toString())
		form.append("title", `${clubEvent.name} Champions`)
		form.append("file", file, clubEvent.normalizeFilename(file.name))

		const dataDocument = await uploadFile({ formData: form })
		const results = await importData({ clubEvent: clubEvent, documentId: dataDocument.id })
		if (results && results.length > 0) {
			setImportFailures(results)
			toast.warn("Champions were imported with errors. Please review the list of failures.")
		} else {
			toast.success("Champions were imported successfully.")
		}
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12">
				<CardContent contentKey="import-champs">
					<>
						<OverlaySpinner loading={uploadStatus === "pending" || importStatus === "pending"} />
						{/* TODO: this should be generalized to import any data file */}
						<UploadDataFileForm
							commandName="Import Champions"
							onSubmit={handleUpload}
							className="mb-2"
						/>
						{uploadError && (
							<ErrorDisplay error={uploadError.message} delay={5000} onClose={() => void 0} />
						)}
						{importError && (
							<ErrorDisplay error={importError.message} delay={15000} onClose={() => void 0} />
						)}
					</>
				</CardContent>
			</div>
			<div className="col-lg-4 col-md-6 col-sm-12">
				<div className="card">
					<div className="card-body">
						<OverlaySpinner loading={status === "pending"} />
						<h4 className="card-header mb-2">{clubEvent.season} Champions</h4>
						<ChampionList champions={champions ?? []} season={clubEvent.season} />
					</div>
				</div>
			</div>
			<div className="col-lg-4 col-md-6 col-sm-12">
				{importFailures.length > 0 && (
					<CardContent contentKey="import-champs-fail">
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
