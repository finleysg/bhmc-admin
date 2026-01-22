"use client"

import { DOCUMENT_TYPES, type Document } from "@repo/domain/types"

interface DocumentListProps {
	documents: Document[]
	onEdit: (document: Document) => void
	onDelete: (document: Document) => void
}

export function DocumentList({ documents, onEdit, onDelete }: DocumentListProps) {
	if (documents.length === 0) {
		return <div className="text-center py-8 text-base-content/60">No documents</div>
	}

	return (
		<div className="overflow-x-auto">
			<table className="table table-zebra">
				<thead>
					<tr>
						<th>Title</th>
						<th>Type</th>
						<th>File</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{documents.map((doc) => {
						const fileName = doc.file.split("/").pop() || "Download"
						return (
							<tr key={doc.id}>
								<td>{doc.title}</td>
								<td>{DOCUMENT_TYPES[doc.documentType]}</td>
								<td>
									<a
										href={doc.file}
										target="_blank"
										rel="noopener noreferrer"
										className="link link-primary"
									>
										{fileName}
									</a>
								</td>
								<td>
									<div className="flex gap-2">
										<button
											type="button"
											className="btn btn-sm btn-ghost"
											onClick={() => onEdit(doc)}
										>
											Edit
										</button>
										<button
											type="button"
											className="btn btn-sm btn-ghost text-error"
											onClick={() => onDelete(doc)}
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
