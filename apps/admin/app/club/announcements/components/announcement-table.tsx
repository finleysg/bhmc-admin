"use client"

import { useEffect, useState } from "react"

import type { Announcement } from "../types"

const PAGE_SIZE = 10

interface AnnouncementTableProps {
	announcements: Announcement[]
	onAdd: () => void
	onEdit: (announcement: Announcement) => void
	onDelete: (announcement: Announcement) => void
}

function getVisibilityLabel(visibility: string): string {
	switch (visibility) {
		case "A":
			return "All"
		case "M":
			return "Members Only"
		case "N":
			return "Non-members"
		default:
			return visibility
	}
}

function getVisibilityBadgeClass(visibility: string): string {
	switch (visibility) {
		case "A":
			return "badge-primary"
		case "M":
			return "badge-secondary"
		case "N":
			return "badge-accent"
		default:
			return "badge-ghost"
	}
}

function getStatus(starts: string, expires: string): { label: string; className: string } {
	const now = new Date()
	const startDate = new Date(starts)
	const expireDate = new Date(expires)

	if (now < startDate) {
		return { label: "Upcoming", className: "badge-info" }
	}
	if (now > expireDate) {
		return { label: "Expired", className: "badge-ghost" }
	}
	return { label: "Active", className: "badge-success" }
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
}

export function AnnouncementTable({
	announcements,
	onAdd,
	onEdit,
	onDelete,
}: AnnouncementTableProps) {
	const [currentPage, setCurrentPage] = useState(0)

	const sorted = [...announcements].sort(
		(a, b) => new Date(b.starts).getTime() - new Date(a.starts).getTime(),
	)
	const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
	const paginated = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

	useEffect(() => {
		if (currentPage >= totalPages && totalPages > 0) {
			setCurrentPage(totalPages - 1)
		}
	}, [currentPage, totalPages])

	return (
		<div>
			<div className="mb-4 flex justify-end">
				<button className="btn btn-primary btn-sm" onClick={onAdd}>
					Add Announcement
				</button>
			</div>

			{announcements.length === 0 ? (
				<p className="text-base-content/70">No announcements found.</p>
			) : (
				<>
					{/* Desktop table */}
					<div className="hidden overflow-x-auto md:block">
						<table className="table">
							<thead>
								<tr>
									<th>Title</th>
									<th>Visibility</th>
									<th>Starts</th>
									<th>Expires</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{paginated.map((a) => {
									const status = getStatus(a.starts, a.expires)
									return (
										<tr key={a.id}>
											<td>{a.title}</td>
											<td>
												<span className={`badge badge-sm ${getVisibilityBadgeClass(a.visibility)}`}>
													{getVisibilityLabel(a.visibility)}
												</span>
											</td>
											<td>{formatDate(a.starts)}</td>
											<td>{formatDate(a.expires)}</td>
											<td>
												<span className={`badge badge-sm ${status.className}`}>{status.label}</span>
											</td>
											<td>
												<div className="flex gap-1">
													<button className="btn btn-ghost btn-xs" onClick={() => onEdit(a)}>
														Edit
													</button>
													<button
														className="btn btn-ghost btn-xs text-error"
														onClick={() => onDelete(a)}
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

					{/* Mobile cards */}
					<div className="space-y-3 md:hidden">
						{paginated.map((a) => {
							const status = getStatus(a.starts, a.expires)
							return (
								<div key={a.id} className="card bg-base-100 shadow-xs">
									<div className="card-body p-4">
										<div className="flex items-start justify-between">
											<h3 className="font-semibold">{a.title}</h3>
											<span className={`badge badge-sm ${status.className}`}>{status.label}</span>
										</div>
										<div className="flex gap-2">
											<span className={`badge badge-sm ${getVisibilityBadgeClass(a.visibility)}`}>
												{getVisibilityLabel(a.visibility)}
											</span>
										</div>
										<p className="text-sm text-base-content/70">
											{formatDate(a.starts)} — {formatDate(a.expires)}
										</p>
										<div className="card-actions justify-end">
											<button className="btn btn-ghost btn-xs" onClick={() => onEdit(a)}>
												Edit
											</button>
											<button
												className="btn btn-ghost btn-xs text-error"
												onClick={() => onDelete(a)}
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</>
			)}

			{totalPages > 1 && (
				<div className="mt-4 flex items-center justify-between">
					<span className="text-sm text-base-content/70">
						Page {currentPage + 1} of {totalPages} ({announcements.length} total)
					</span>
					<div className="join">
						<button
							className="join-item btn btn-sm"
							onClick={() => setCurrentPage(0)}
							disabled={currentPage === 0}
						>
							{"<<"}
						</button>
						<button
							className="join-item btn btn-sm"
							onClick={() => setCurrentPage((p) => p - 1)}
							disabled={currentPage === 0}
						>
							{"<"}
						</button>
						<button
							className="join-item btn btn-sm"
							onClick={() => setCurrentPage((p) => p + 1)}
							disabled={currentPage >= totalPages - 1}
						>
							{">"}
						</button>
						<button
							className="join-item btn btn-sm"
							onClick={() => setCurrentPage(totalPages - 1)}
							disabled={currentPage >= totalPages - 1}
						>
							{">>"}
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
