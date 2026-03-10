"use client"

import { useMemo, useState } from "react"

import { DOCUMENT_TYPES, type DocumentTypeCode } from "@repo/domain/types"
import { Badge } from "@/components/ui/badge"

import type { AvailableDocument } from "../types"

interface DocumentPickerProps {
	documents: AvailableDocument[]
	selectedIds: number[]
	onToggle: (docId: number) => void
	disabled?: boolean
}

export function DocumentPicker({
	documents,
	selectedIds,
	onToggle,
	disabled,
}: DocumentPickerProps) {
	const [searchText, setSearchText] = useState("")
	const [yearFilter, setYearFilter] = useState<number | "all">(new Date().getFullYear())
	const [typeFilter, setTypeFilter] = useState<DocumentTypeCode | "all">("all")

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

	const availableYears = useMemo(() => {
		const years = new Set<number>()
		for (const doc of documents) {
			if (doc.year != null) {
				years.add(doc.year)
			}
		}
		return Array.from(years).sort((a, b) => b - a)
	}, [documents])

	const availableTypes = useMemo(() => {
		const types = new Set<string>()
		for (const doc of documents) {
			types.add(doc.document_type)
		}
		return (Object.keys(DOCUMENT_TYPES) as DocumentTypeCode[]).filter((code) => types.has(code))
	}, [documents])

	const filteredDocuments = useMemo(() => {
		let result = documents

		if (yearFilter !== "all") {
			result = result.filter((doc) => doc.year === yearFilter)
		}

		if (typeFilter !== "all") {
			result = result.filter((doc) => doc.document_type === typeFilter)
		}

		if (searchText.trim()) {
			const search = searchText.trim().toLowerCase()
			result = result.filter((doc) => doc.title.toLowerCase().includes(search))
		}

		return result.toSorted((a, b) => b.last_update.localeCompare(a.last_update))
	}, [documents, yearFilter, typeFilter, searchText])

	const selectedDocuments = useMemo(
		() => documents.filter((doc) => selectedSet.has(doc.id)),
		[documents, selectedIds],
	)

	return (
		<div className="space-y-2">
			{selectedDocuments.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{selectedDocuments.map((doc) => (
						<Badge
							key={doc.id}
							variant="info"
							onClose={disabled ? undefined : () => onToggle(doc.id)}
						>
							{doc.title}
						</Badge>
					))}
				</div>
			)}

			<div className="flex flex-col gap-2 sm:flex-row">
				<input
					type="text"
					className="input input-bordered input-sm flex-1"
					placeholder="Search documents..."
					value={searchText}
					onChange={(e) => setSearchText(e.target.value)}
					disabled={disabled}
				/>
				<select
					className="select select-bordered select-sm"
					value={yearFilter}
					onChange={(e) => setYearFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
					disabled={disabled}
				>
					<option value="all">All years</option>
					{availableYears.map((year) => (
						<option key={year} value={year}>
							{year}
						</option>
					))}
				</select>
				<select
					className="select select-bordered select-sm"
					value={typeFilter}
					onChange={(e) =>
						setTypeFilter(e.target.value === "all" ? "all" : (e.target.value as DocumentTypeCode))
					}
					disabled={disabled}
				>
					<option value="all">All types</option>
					{availableTypes.map((code) => (
						<option key={code} value={code}>
							{DOCUMENT_TYPES[code]}
						</option>
					))}
				</select>
			</div>

			<p className="text-sm text-base-content/60">
				Showing {filteredDocuments.length} of {documents.length} documents
			</p>

			<div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-base-300 p-3">
				{filteredDocuments.length === 0 ? (
					<p className="py-2 text-center text-sm text-base-content/60">
						No documents match your filters
					</p>
				) : (
					filteredDocuments.map((doc) => (
						<label key={doc.id} className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								className="checkbox checkbox-sm"
								checked={selectedSet.has(doc.id)}
								onChange={() => onToggle(doc.id)}
								disabled={disabled}
							/>
							<span className="text-sm">
								{doc.title}
								{doc.year ? ` (${doc.year})` : ""}
							</span>
							<span className="badge badge-ghost badge-sm">
								{DOCUMENT_TYPES[doc.document_type as DocumentTypeCode] ?? doc.document_type}
							</span>
						</label>
					))
				)}
			</div>
		</div>
	)
}
