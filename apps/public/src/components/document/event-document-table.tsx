import { format } from "date-fns"

import { documentTypeMap } from "../../models/codes"
import { BhmcDocument } from "../../models/document"

interface EventDocumentTableProps {
	documents: BhmcDocument[]
	onDelete: (doc: BhmcDocument) => void
	onUpdate: (doc: BhmcDocument) => void
}

export function EventDocumentTable({ documents, onDelete, onUpdate }: EventDocumentTableProps) {
	if (documents.length === 0) {
		return <p>No files have been uploaded yet. Click &quot;Upload New&quot; to get started.</p>
	}

	return (
		<>
			<div className="row mb-2">
				<div className="col">
					<h6>Document Type</h6>
				</div>
				<div className="col">
					<h6>Title</h6>
				</div>
				<div className="col">
					<h6>Last Update</h6>
				</div>
				<div className="col d-flex justify-content-end">&nbsp;</div>
			</div>
			{documents?.map((doc) => {
				return (
					<div key={doc.id} className="row mb-2">
						<div className="col">{documentTypeMap.get(doc.documentType)}</div>
						<div className="col">{doc.title}</div>
						<div className="col">{format(doc.lastUpdate, "MMMM d, yyyy h:mm aaaa")}</div>
						<div className="col d-flex justify-content-end">
							<button className="btn btn-danger btn-sm me-2" onClick={() => onDelete(doc)}>
								Delete
							</button>
							<button className="btn btn-info btn-sm" onClick={() => onUpdate(doc)}>
								Update
							</button>
						</div>
					</div>
				)
			})}
		</>
	)
}
