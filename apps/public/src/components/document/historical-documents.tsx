import { useDocuments } from "../../hooks/use-documents"
import { DocumentList } from "./document-list"

interface HistoricalDocumentsProps {
	documentTypeCode: string
	title?: string
	includedSeason?: number
	excludedSeason?: number
}

export function HistoricalDocuments({
	documentTypeCode,
	includedSeason,
	excludedSeason,
	title,
}: HistoricalDocumentsProps) {
	const { data: documents } = useDocuments(documentTypeCode)

	const getDocuments = () => {
		if (includedSeason) {
			return documents?.filter((doc) => doc.year === includedSeason) ?? []
		} else if (excludedSeason) {
			return documents?.filter((doc) => doc.year !== excludedSeason) ?? []
		} else {
			return documents ?? []
		}
	}
	return (
		<DocumentList
			documents={getDocuments()}
			title={title ?? "Past Seasons"}
			noResultMessage="No documents found"
		/>
	)
}
