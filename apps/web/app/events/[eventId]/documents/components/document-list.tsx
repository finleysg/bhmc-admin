"use client"

import { DOCUMENT_TYPES, type Document } from "@repo/domain/types"
import { Card, CardBody } from "@/components/ui/card"
import { HelperText } from "@/components/ui/helper-text"

interface DocumentListProps {
	documents: Document[]
	onEdit: (document: Document) => void
	onDelete: (document: Document) => void
}

export function DocumentList({ documents, onEdit, onDelete }: DocumentListProps) {
	if (documents.length === 0) {
		return (
			<Card shadow="xs">
				<CardBody>
					<div className="text-center py-4 text-base-content/60">No documents</div>
				</CardBody>
			</Card>
		)
	}

	return (
		<Card shadow="xs">
			<CardBody>
				{/* Desktop: table */}
				<div className="hidden md:block overflow-x-auto">
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
										<td>{DOCUMENT_TYPES[doc.documentType] ?? doc.documentType}</td>
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

				{/* Mobile: stacked cards */}
				<div className="md:hidden space-y-4">
					{documents.map((doc) => {
						const fileName = doc.file.split("/").pop() || "Download"
						return (
							<div key={doc.id} className="border-b border-base-300 pb-4 last:border-0">
								<div className="font-semibold">{doc.title}</div>
								<HelperText>{DOCUMENT_TYPES[doc.documentType] ?? doc.documentType}</HelperText>
								<a
									href={doc.file}
									target="_blank"
									rel="noopener noreferrer"
									className="link link-primary text-sm"
								>
									{fileName}
								</a>
								<div className="flex gap-2 mt-2">
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
							</div>
						)
					})}
				</div>
			</CardBody>
		</Card>
	)
}
