import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { useRegistrationUpdate } from "../../hooks/use-registration-update"
import { useManageRegistration } from "./manage-registration"

export function AddNotesScreen() {
	const { registration } = useManageRegistration()
	const updateRegistration = useRegistrationUpdate()
	const navigate = useNavigate()

	const initialNotes = registration.notes ?? ""
	const [notes, setNotes] = useState(initialNotes)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSave = async () => {
		if (notes === initialNotes) return // No changes to save
		setIsSubmitting(true)
		try {
			await updateRegistration.mutateAsync({ registrationId: registration.id, notes })
			toast.success("Notes saved")
			navigate("..")
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to save notes")
			setIsSubmitting(false)
		}
	}

	const handleBack = () => {
		navigate("..")
	}

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2 text-primary">Add Notes</h4>
						<div className="mb-4">
							<label htmlFor="notes" className="form-label fw-semibold">
								Notes / Player Requests
							</label>
							<textarea
								id="notes"
								className="form-control"
								rows={8}
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Enter any special requests or notes for your registration..."
								disabled={isSubmitting}
							/>
						</div>
						<hr />
						<div style={{ textAlign: "right" }}>
							<button
								className="btn btn-secondary me-2"
								onClick={handleBack}
								disabled={isSubmitting}
							>
								Back
							</button>
							<button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
								Save
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
