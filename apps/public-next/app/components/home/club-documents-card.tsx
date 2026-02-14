import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentCard } from "@/components/document-card"
import type { StaticDocument } from "@/lib/types"

interface ClubDocumentsCardProps {
	documents: StaticDocument[]
	title?: string
}

export function ClubDocumentsCard({ documents, title = "Club Documents" }: ClubDocumentsCardProps) {
	const validDocs = documents.filter((d) => d.document)

	if (validDocs.length === 0) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{validDocs.map((doc) => (
						<DocumentCard
							key={doc.id}
							title={doc.document.title}
							file={doc.document.file}
							lastUpdate={doc.document.last_update}
							variant="primary"
						/>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
