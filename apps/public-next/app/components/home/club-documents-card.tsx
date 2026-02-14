import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { resolvePhotoUrl } from "@/lib/photo-utils"
import { FileText } from "lucide-react"
import { format } from "date-fns"
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
						<a
							key={doc.id}
							href={resolvePhotoUrl(doc.document.file)}
							target="_blank"
							rel="noreferrer"
							title={doc.document.title}
							className="flex items-center gap-2 rounded bg-muted p-2 text-sm text-primary transition-colors hover:bg-accent"
						>
							<FileText className="size-5 shrink-0" />
							<div className="min-w-0">
								<p className="truncate font-medium">{doc.document.title}</p>
								<p className="text-xs text-muted-foreground">
									Updated: {format(new Date(doc.document.last_update), "MMMM d, yyyy h:mm aaaa")}
								</p>
							</div>
						</a>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
