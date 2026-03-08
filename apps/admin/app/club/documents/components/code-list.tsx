"use client"

import type { ClubDocumentCode, StaticDocument } from "@repo/domain/types"
import { Card, CardBody } from "@/components/ui/card"
import { HelperText } from "@/components/ui/helper-text"

interface CodeListProps {
	codes: ClubDocumentCode[]
	staticDocuments: StaticDocument[]
	onUpload: (code: ClubDocumentCode) => void
	onReplace: (code: ClubDocumentCode, staticDoc: StaticDocument) => void
	onRemove: (code: ClubDocumentCode, staticDoc: StaticDocument) => void
}

export function CodeList({ codes, staticDocuments, onUpload, onReplace, onRemove }: CodeListProps) {
	const getStaticDocument = (code: string): StaticDocument | undefined => {
		return staticDocuments.find((sd) => sd.code === code)
	}

	if (codes.length === 0) {
		return (
			<Card shadow="xs">
				<CardBody>
					<div className="text-center py-4 text-base-content/60">No document codes</div>
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
								<th>Code</th>
								<th>Display Name</th>
								<th>Location</th>
								<th>Document</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{codes.map((code) => {
								const staticDoc = getStaticDocument(code.code)
								const fileName = staticDoc?.document.file.split("/").pop()
								return (
									<tr key={code.id}>
										<td>{code.code}</td>
										<td>{code.displayName}</td>
										<td>{code.location || "-"}</td>
										<td>
											{staticDoc ? (
												<a
													href={staticDoc.document.file}
													target="_blank"
													rel="noopener noreferrer"
													className="link link-primary"
												>
													{fileName}
												</a>
											) : (
												<span className="text-base-content/60">No document</span>
											)}
										</td>
										<td>
											<div className="flex gap-2">
												{staticDoc ? (
													<>
														<button
															type="button"
															className="btn btn-sm btn-ghost"
															onClick={() => onReplace(code, staticDoc)}
														>
															Replace
														</button>
														<button
															type="button"
															className="btn btn-sm btn-ghost text-error"
															onClick={() => onRemove(code, staticDoc)}
														>
															Remove
														</button>
													</>
												) : (
													<button
														type="button"
														className="btn btn-sm btn-ghost"
														onClick={() => onUpload(code)}
													>
														Upload
													</button>
												)}
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
					{codes.map((code) => {
						const staticDoc = getStaticDocument(code.code)
						const fileName = staticDoc?.document.file.split("/").pop()
						return (
							<div key={code.id} className="border-b border-base-300 pb-4 last:border-0">
								<div className="font-semibold">{code.displayName}</div>
								<HelperText className="mb-1">
									{code.code} {code.location && `• ${code.location}`}
								</HelperText>
								{staticDoc ? (
									<a
										href={staticDoc.document.file}
										target="_blank"
										rel="noopener noreferrer"
										className="link link-primary text-sm"
									>
										{fileName}
									</a>
								) : (
									<span className="text-base-content/60 text-sm">No document</span>
								)}
								<div className="flex gap-2 mt-2">
									{staticDoc ? (
										<>
											<button
												type="button"
												className="btn btn-sm btn-ghost"
												onClick={() => onReplace(code, staticDoc)}
											>
												Replace
											</button>
											<button
												type="button"
												className="btn btn-sm btn-ghost text-error"
												onClick={() => onRemove(code, staticDoc)}
											>
												Remove
											</button>
										</>
									) : (
										<button
											type="button"
											className="btn btn-sm btn-ghost"
											onClick={() => onUpload(code)}
										>
											Upload
										</button>
									)}
								</div>
							</div>
						)
					})}
				</div>
			</CardBody>
		</Card>
	)
}
