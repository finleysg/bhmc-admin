import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentCard } from "@/components/document-card"
import { fetchDjango } from "@/lib/fetchers"
import type { Document } from "@/lib/types"

interface EventDocumentsCardProps {
	eventId: number
}

export async function EventDocumentsCard({ eventId }: EventDocumentsCardProps) {
	let documents: Document[] = []
	try {
		documents = await fetchDjango<Document[]>(`/documents/?event_id=${eventId}`, {
			tags: ["documents"],
		})
	} catch {
		return null
	}

	if (documents.length === 0) {
		return null
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-md font-heading text-primary">Documents</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-1">
					{documents.map((doc) => (
						<DocumentCard
							key={doc.id}
							title={doc.title}
							file={doc.file}
							lastUpdate={doc.last_update}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
