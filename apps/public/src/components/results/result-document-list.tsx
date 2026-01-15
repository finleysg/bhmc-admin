import { isAfter, isBefore } from "date-fns"

import { useDocuments } from "../../hooks/use-documents"
import { DocumentType } from "../../models/codes"
import { SeasonProps } from "../../models/common-props"
import { DocumentList } from "../document/document-list"

interface ResultDocumentListProps extends SeasonProps {
	eventType: string
}

export function ResultDocumentList({ eventType, season }: ResultDocumentListProps) {
	const { data: documents } = useDocuments(DocumentType.Results, season) ?? []

	const filteredDocuments = () => {
		if (!documents) return []
		return documents
			.filter((doc) => doc.eventType === eventType)
			.sort((a, b) => {
				if (isBefore(a.lastUpdate, b.lastUpdate)) {
					return -1
				}
				if (isAfter(a.lastUpdate, b.lastUpdate)) {
					return 1
				}
				return 0
			})
	}

	return (
		<DocumentList
			documents={filteredDocuments()}
			title={`${season} Results`}
			noResultMessage="No results yet for this season."
		/>
	)
}
