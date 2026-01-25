import { ChangeEvent, useState } from "react"

import { toast } from "react-toastify"

import { CardContent } from "../../components/card/content"
import { ClubDocumentEditor } from "../../components/document/club-document-editor"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { useClubDocumentCodes, useClubDocuments } from "../../hooks/use-club-documents"
import { ClubDocument, ClubDocumentCode } from "../../models/document"

export function ClubDocumentsScreen() {
	const [currentDocument, setCurrentDocument] = useState<ClubDocument | null>(null)
	const [selectedCodeObj, setSelectedCodeObj] = useState<ClubDocumentCode | null>(null)
	const [selectedCode, setSelectedCode] = useState("NA")
	const { data: documents, status: documentsStatus } = useClubDocuments()
	const { data: codes, status: codesStatus } = useClubDocumentCodes()

	const isLoading = documentsStatus === "pending" || codesStatus === "pending"

	const handleDocumentSelect = (e: ChangeEvent<HTMLSelectElement>) => {
		const code = e.target.value
		setSelectedCode(code)

		const codeObj = codes?.find((c) => c.code === code)
		setSelectedCodeObj(codeObj ?? null)

		const doc = documents?.find((doc) => doc.code === code)
		if (doc) {
			setCurrentDocument(doc)
		} else {
			setCurrentDocument(null)
		}
	}

	const handleComplete = () => {
		toast.success(`${selectedCodeObj?.displayName ?? selectedCode} has been saved.`)
		setCurrentDocument(null)
		setSelectedCodeObj(null)
		setSelectedCode("NA")
	}

	const handleCancel = () => {
		setCurrentDocument(null)
		setSelectedCodeObj(null)
		setSelectedCode("NA")
	}

	return (
		<div className="row">
			<div className="col-lg-4 col-md-6 col-sm-12 offset-lg-4 offset-md-3">
				<OverlaySpinner loading={isLoading} />
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
							{codes?.map((code) => (
								<option key={code.code} value={code.code}>
									{code.displayName} ({code.location})
								</option>
							))}
						</select>
					</div>
				</CardContent>
				{selectedCodeObj && (
					<ClubDocumentEditor
						code={selectedCodeObj.code}
						displayName={selectedCodeObj.displayName}
						document={currentDocument ?? undefined}
						onCancel={handleCancel}
						onComplete={handleComplete}
					/>
				)}
			</div>
		</div>
	)
}
