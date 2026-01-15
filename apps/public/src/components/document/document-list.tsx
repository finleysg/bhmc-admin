import React from "react"

import { BhmcDocument } from "../../models/document"
import { DocumentCard } from "./document-card"

interface DocumentListProps {
	documents: BhmcDocument[]
	title: string
	noResultMessage: string
}

export function DocumentList({ documents, title, noResultMessage }: DocumentListProps) {
	const hasDocuments = Boolean(documents) && documents.length > 0

	return (
		<div className="card mb-4">
			<div className="card-body">
				<h4 className="card-header">{title}</h4>
				<React.Fragment>
					{hasDocuments || <p className="mt-2 text-danger">{noResultMessage}</p>}
					{hasDocuments && documents.map((doc) => <DocumentCard key={doc.id} document={doc} />)}
				</React.Fragment>
			</div>
		</div>
	)
}
