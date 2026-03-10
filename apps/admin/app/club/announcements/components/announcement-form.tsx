"use client"

import { useMemo, useState } from "react"

import { ContentEditor } from "@/components/content-editor"

import type { Announcement, AnnouncementFormData, AvailableDocument, ClubEvent } from "../types"
import { DocumentPicker } from "./document-picker"

interface AnnouncementFormProps {
	announcement?: Announcement
	events: ClubEvent[]
	documents: AvailableDocument[]
	onSubmit: (data: AnnouncementFormData) => void | Promise<void>
	onCancel: () => void
	isSubmitting: boolean
}

function toDatetimeLocalValue(dateStr: string): string {
	const date = new Date(dateStr)
	const offset = date.getTimezoneOffset()
	const local = new Date(date.getTime() - offset * 60000)
	return local.toISOString().slice(0, 16)
}

function fromDatetimeLocalValue(value: string): string {
	return new Date(value).toISOString()
}

export function AnnouncementForm({
	announcement,
	events,
	documents,
	onSubmit,
	onCancel,
	isSubmitting,
}: AnnouncementFormProps) {
	const [title, setTitle] = useState(announcement?.title ?? "")
	const [text, setText] = useState(announcement?.text ?? "")
	const [visibility, setVisibility] = useState(announcement?.visibility ?? "A")
	const [starts, setStarts] = useState(
		announcement ? toDatetimeLocalValue(announcement.starts) : "",
	)
	const [expires, setExpires] = useState(
		announcement ? toDatetimeLocalValue(announcement.expires) : "",
	)
	const [eventId, setEventId] = useState<number | null>(announcement?.eventId ?? null)
	const [documentIds, setDocumentIds] = useState<number[]>(
		announcement?.documents.map((d) => d.id) ?? [],
	)
	const [validationError, setValidationError] = useState<string | null>(null)

	const initialValues = useMemo(
		() => ({
			title: announcement?.title ?? "",
			text: announcement?.text ?? "",
			visibility: announcement?.visibility ?? "A",
			starts: announcement ? toDatetimeLocalValue(announcement.starts) : "",
			expires: announcement ? toDatetimeLocalValue(announcement.expires) : "",
			eventId: announcement?.eventId ?? null,
			documentIds: [...(announcement?.documents.map((d) => d.id) ?? [])].sort(),
		}),
		[announcement],
	)

	const isDirty =
		title !== initialValues.title ||
		text !== initialValues.text ||
		visibility !== initialValues.visibility ||
		starts !== initialValues.starts ||
		expires !== initialValues.expires ||
		eventId !== initialValues.eventId ||
		JSON.stringify([...documentIds].sort()) !== JSON.stringify(initialValues.documentIds)

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		setValidationError(null)

		if (!title.trim()) {
			setValidationError("Title is required")
			return
		}
		if (!text.trim()) {
			setValidationError("Text is required")
			return
		}
		if (!starts) {
			setValidationError("Start date is required")
			return
		}
		if (!expires) {
			setValidationError("Expiration date is required")
			return
		}

		void onSubmit({
			title: title.trim(),
			text: text.trim(),
			visibility,
			starts: fromDatetimeLocalValue(starts),
			expires: fromDatetimeLocalValue(expires),
			eventId,
			documentIds,
		})
	}

	const toggleDocument = (docId: number) => {
		setDocumentIds((prev) =>
			prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
		)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{validationError && (
				<div className="alert alert-error alert-sm">
					<span>{validationError}</span>
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="form-control sm:col-span-2">
					<label className="label" htmlFor="title">
						<span className="label-text">Title</span>
					</label>
					<input
						id="title"
						type="text"
						className="input input-bordered w-full"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>

				<div className="form-control">
					<label className="label" htmlFor="eventId">
						<span className="label-text">Event (optional)</span>
					</label>
					<select
						id="eventId"
						className="select select-bordered w-full"
						value={eventId ?? ""}
						onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : null)}
						disabled={isSubmitting}
					>
						<option value="">None</option>
						{events.map((evt) => (
							<option key={evt.id} value={evt.id}>
								{evt.name} ({evt.startDate})
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="form-control">
				<label className="label">
					<span className="label-text">Text</span>
				</label>
				<ContentEditor
					value={text}
					onChange={setText}
					disabled={isSubmitting}
					placeholder="Write your announcement..."
					minHeight="200px"
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="form-control">
					<label className="label" htmlFor="starts">
						<span className="label-text">Starts</span>
					</label>
					<input
						id="starts"
						type="datetime-local"
						className="input input-bordered w-full"
						value={starts}
						onChange={(e) => setStarts(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>

				<div className="form-control">
					<label className="label" htmlFor="expires">
						<span className="label-text">Expires</span>
					</label>
					<input
						id="expires"
						type="datetime-local"
						className="input input-bordered w-full"
						value={expires}
						onChange={(e) => setExpires(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>

				<div className="form-control">
					<label className="label">
						<span className="label-text">Visibility</span>
					</label>
					<div className="join w-full">
						{[
							{ value: "A", label: "All" },
							{ value: "M", label: "Members" },
							{ value: "N", label: "Guests" },
						].map((opt) => (
							<button
								key={opt.value}
								type="button"
								className={`btn join-item flex-1 ${visibility === opt.value ? "btn-primary" : "btn-ghost border-base-content/20"}`}
								onClick={() => setVisibility(opt.value)}
								disabled={isSubmitting}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{documents.length > 0 && (
				<div className="form-control">
					<label className="label">
						<span className="label-text">Documents</span>
					</label>
					<DocumentPicker
						documents={documents}
						selectedIds={documentIds}
						onToggle={toggleDocument}
						disabled={isSubmitting}
					/>
				</div>
			)}

			<div className="flex justify-end gap-2">
				<button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
					{isDirty ? "Cancel" : "Back"}
				</button>
				<button type="submit" className="btn btn-primary" disabled={isSubmitting}>
					{isSubmitting ? (
						<>
							<span className="loading loading-spinner loading-sm"></span>
							Saving...
						</>
					) : (
						"Save"
					)}
				</button>
			</div>
		</form>
	)
}
