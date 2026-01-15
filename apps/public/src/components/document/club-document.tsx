import { useClubDocument } from "../../hooks/use-club-documents"
import { DocumentCard } from "./document-card"

interface ClubDocumentProps {
	code: string
}

export function ClubDocument({ code }: ClubDocumentProps) {
	const { data } = useClubDocument(code)

	if (data) {
		return <DocumentCard document={data?.document} />
	}
	return null
}
