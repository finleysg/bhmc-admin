import { ChangeEvent, useState } from "react"

import { toast } from "react-toastify"

import { CardContent } from "../../components/card/content"
import { ClubDocumentEditor } from "../../components/document/club-document-editor"
import { SelectOption } from "../../components/forms/select-control"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useClubDocuments } from "../../hooks/use-club-documents"
import { clubDocumentMap, getClubDocumentName } from "../../models/codes"
import { ClubDocument } from "../../models/document"

export function ClubDocumentsScreen() {
	const [currentDocument, setCurrentDocument] = useState<ClubDocument | null>(null)
	const [selectedCode, setSelectedCode] = useState("NA")
	const { data: documents, status } = useClubDocuments()

	const documentOptions = () => {
		const options: SelectOption[] = []
		clubDocumentMap.forEach((value, key) => {
			options.push({ value: key, name: value })
		})
		return options
	}

	const handleDocumentSelect = (e: ChangeEvent<HTMLSelectElement>) => {
		const code = e.target.value
		setSelectedCode(code)

		const doc = documents?.find((doc) => doc.code === code)
		if (doc) {
			setCurrentDocument(doc)
		} else {
			setCurrentDocument(null)
		}
	}

	const handleComplete = () => {
		toast.success(`${getClubDocumentName(selectedCode)} has been saved.`)
		setCurrentDocument(null)
		setSelectedCode("NA")
	}

	const handleCancel = () => {
		setCurrentDocument(null)
		setSelectedCode("NA")
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12 offset-lg-4 offset-md-3">
				<OverlaySpinner loading={status === "pending"} />
				<CardContent contentKey="club-documents">
					<div className="form-group mb-2">
						<label htmlFor="doc-list">Club Documents</label>
						<select
							id="doc-list"
							value={selectedCode}
							onChange={handleDocumentSelect}
							className="form-control"
						>
							<option key="NA" value="NA">
								--Select--
							</option>
							{documentOptions().map((opt) => {
								return (
									<option key={opt.value} value={opt.value}>
										{opt.name}
									</option>
								)
							})}
						</select>
					</div>
				</CardContent>
				{currentDocument && (
					<ClubDocumentEditor
						code={currentDocument.code}
						document={currentDocument}
						onCancel={handleCancel}
						onComplete={handleComplete}
					/>
				)}
			</div>
		</div>
	)
}
