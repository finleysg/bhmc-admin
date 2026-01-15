import { ChangeEvent, useState } from "react"

interface EditNotesProps {
	registrationNotes: string | null
	signedUpBy: string
	onEdit: (notes: string) => void
	onCancel: () => void
}

export function EditNotes({ registrationNotes, signedUpBy, onEdit, onCancel }: EditNotesProps) {
	const [notes, setNotes] = useState(registrationNotes || "")

	const handleCancel = () => {
		setNotes("")
		onCancel()
	}

	const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		const newNotes = e.target.value
		setNotes(newNotes)
	}

	const handleEdit = () => {
		onEdit(notes)
		setNotes("")
	}

	return (
		<div className="card border border-info">
			<div className="card-body">
				<h4 className="card-header text-info mb-2">Edit Registration Notes</h4>
				<p className="mt-2 fw-bold text-info-emphasis">Registering player: {signedUpBy}</p>
				<div className="form-group mb-2">
					<label htmlFor="registration-notes" className="form-label">
						Notes / Player Requests
					</label>
					<textarea
						id="registration-notes"
						name="notes"
						className="form-control fc-alt"
						value={notes}
						onChange={handleNotesChange}
						rows={5}
						aria-describedby="notes-help"
					/>
					<div id="notes-help" className="form-text">
						Add any special requests or notes for this player&apos;s registration.
					</div>
				</div>
				<div className="card-footer d-flex justify-content-end pb-0">
					<button
						type="button"
						className="btn btn-light btn-sm me-2 mt-2"
						onClick={handleCancel}
						aria-label="Cancel editing notes"
					>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn-info btn-sm mt-2"
						onClick={handleEdit}
						aria-label="Save registration notes"
					>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	)
}
