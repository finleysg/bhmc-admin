import { ChangeEvent, useState } from "react"

import { useNavigate } from "react-router-dom"

import { CancelButton } from "../../components/event-registration/cancel-button"
import { RegistrationAmountDue } from "../../components/event-registration/registration-amount-due"
import { RegistrationSlotGroup } from "../../components/event-registration/registration-slot-group"
import { ErrorDisplay } from "../../components/feedback/error-display"
import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { ReviewStep } from "../../context/registration-reducer"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { useEventRegistrationGuard } from "../../hooks/use-event-registration-guard"
import { NoAmount } from "../../models/payment"
import { useCurrentEvent } from "./event-detail"

export function EditRegistrationScreen() {
	const navigate = useNavigate()
	const { clubEvent } = useCurrentEvent()
	const {
		currentStep,
		error,
		existingFees,
		payment,
		registration,
		addFee,
		removeFee,
		removePlayer,
		savePayment,
		setError,
		updateRegistrationNotes,
		updateStep,
	} = useEventRegistration()
	useEventRegistrationGuard(registration)

	const [notes, setNotes] = useState<string>(registration?.notes ?? "")
	const [isBusy, setIsBusy] = useState(false)

	const amountDue = payment?.getAmountDue(clubEvent?.feeMap) ?? NoAmount
	const layout =
		clubEvent?.maximumSignupGroupSize === 1
			? "vertical"
			: (clubEvent?.fees.length ?? 0) > 5
				? "vertical"
				: "horizontal"

	const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		setNotes(e.target.value)
	}

	const handleNextStep = async () => {
		setIsBusy(true)
		try {
			await updateRegistrationNotes(notes)
			await savePayment()
			updateStep(ReviewStep)
			navigate("../review", { replace: true })
		} catch (err) {
			setError(err as Error)
		} finally {
			setIsBusy(false)
		}
	}

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<OverlaySpinner loading={isBusy} />
						<h4 className="card-header mb-2">{currentStep.title}</h4>
						{error && (
							<ErrorDisplay error={error?.message} delay={5000} onClose={() => setError(null)} />
						)}
						<p className="text-info fst-italic">{registration?.selectedStart}</p>
						{payment && registration && (
							<RegistrationSlotGroup
								eventFees={clubEvent.fees}
								existingFees={existingFees}
								registration={registration}
								payment={payment}
								removePlayer={removePlayer}
								addFee={addFee}
								removeFee={removeFee}
								layout={layout}
								mode="edit"
								teamSize={clubEvent.teamSize}
								skinsType={clubEvent.skinsType}
							/>
						)}
						<RegistrationAmountDue amountDue={amountDue} />
						<hr />
						<div className="row">
							<div className="col-12">
								<label className="text-primary" htmlFor="notes">
									Notes / Special Requests
								</label>
								<textarea
									id="notes"
									name="notes"
									className="form-control fc-alt"
									value={notes}
									onChange={handleNotesChange}
									readOnly={false}
									rows={5}
								></textarea>
							</div>
						</div>
						<div className="row mt-2" style={{ textAlign: "right" }}>
							<div className="col-12">
								<CancelButton mode="edit" />
								<button className="btn btn-primary ms-2" disabled={isBusy} onClick={handleNextStep}>
									Continue
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
