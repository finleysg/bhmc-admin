"use client"

import { useState } from "react"

import type { Announcement, AnnouncementFormData, AvailableDocument, ClubEvent } from "../types"

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

			<div className="form-control">
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
				<label className="label" htmlFor="text">
					<span className="label-text">Text</span>
				</label>
				<textarea
					id="text"
					className="textarea textarea-bordered h-32 w-full"
					value={text}
					onChange={(e) => setText(e.target.value)}
					disabled={isSubmitting}
				/>
			</div>

			<div className="form-control">
				<label className="label" htmlFor="visibility">
					<span className="label-text">Visibility</span>
				</label>
				<select
					id="visibility"
					className="select select-bordered w-full"
					value={visibility}
					onChange={(e) => setVisibility(e.target.value)}
					disabled={isSubmitting}
				>
					<option value="A">All</option>
					<option value="M">Members Only</option>
					<option value="N">Non-members Only</option>
				</select>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

			{documents.length > 0 && (
				<div className="form-control">
					<label className="label">
						<span className="label-text">Documents</span>
					</label>
					<div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-base-300 p-3">
						{documents.map((doc) => (
							<label key={doc.id} className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									className="checkbox checkbox-sm"
									checked={documentIds.includes(doc.id)}
									onChange={() => toggleDocument(doc.id)}
									disabled={isSubmitting}
								/>
								<span className="text-sm">
									{doc.title}
									{doc.year ? ` (${doc.year})` : ""}
								</span>
							</label>
						))}
					</div>
				</div>
			)}

			<div className="flex justify-end gap-2">
				<button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
					Cancel
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
