"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentCard } from "@/components/document-card"
import type { Document } from "@/lib/types"

interface DocumentListProps {
	documents: Document[]
	title: string
	emptyMessage?: string
	initialCount?: number
}

export function DocumentList({
	documents,
	title,
	emptyMessage = "No documents found",
	initialCount,
}: DocumentListProps) {
	const [expanded, setExpanded] = useState(false)
	const canExpand = initialCount !== undefined && documents.length > initialCount
	const visible = canExpand && !expanded ? documents.slice(0, initialCount) : documents

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-primary">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{documents.length === 0 ? (
					<p className="text-sm text-muted-foreground">{emptyMessage}</p>
				) : (
					<div className="space-y-1">
						{visible.map((doc) => (
							<DocumentCard
								key={doc.id}
								title={doc.title}
								file={doc.file}
								lastUpdate={doc.last_update}
							/>
						))}
						{canExpand && (
							<button
								onClick={() => setExpanded(!expanded)}
								className="text-sm text-primary hover:underline"
							>
								{expanded ? "Show less" : `More... (${documents.length - initialCount})`}
							</button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
