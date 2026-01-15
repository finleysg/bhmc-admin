import { useNavigate } from "react-router-dom"

import { CancelButton } from "../../components/event-registration/cancel-button"
import { RegisterCountdown } from "../../components/event-registration/register-countdown"
import { RegistrationSlotLineItemReview } from "../../components/event-registration/registration-slot-line-item-review"
import { ErrorDisplay } from "../../components/feedback/error-display"
// import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { CompleteStep, PaymentStep, RegisterStep } from "../../context/registration-reducer"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { useEventRegistrationGuard } from "../../hooks/use-event-registration-guard"
import { NoAmount } from "../../models/payment"
import { useCurrentEvent } from "./event-detail"

export function ReviewRegistrationScreen() {
	const { clubEvent } = useCurrentEvent()
	const {
		currentStep,
		registration,
		payment,
		mode,
		error,
		setError,
		updateStep,
		completeRegistration,
	} = useEventRegistration()
	useEventRegistrationGuard(registration)

	const navigate = useNavigate()

	const isBusy = !payment?.hasPaymentDetails()
	const amountDue = payment?.getAmountDue(clubEvent?.feeMap) ?? NoAmount

	const handleBack = () => {
		updateStep(RegisterStep)
		if (mode === "edit") {
			navigate("../edit", { replace: true })
		} else {
			navigate("../register", { replace: true })
		}
	}

	const handleRegistrationConfirm = () => {
		if (amountDue.total > 0) {
			updateStep(PaymentStep)
			navigate(`../${payment?.id}/payment`, { replace: true })
		} else {
			updateStep(CompleteStep)
			completeRegistration()
			navigate("../", { replace: true }) // event detail
		}
	}

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						{/* <OverlaySpinner loading={isBusy} /> */}
						<h4 className="card-header mb-2">{currentStep.title}</h4>
						{error && (
							<ErrorDisplay error={error?.message} delay={5000} onClose={() => setError(null)} />
						)}
						<p className="text-info fst-italic">{registration?.selectedStart}</p>
						{clubEvent &&
							payment &&
							registration &&
							registration.slots
								.filter((s) => Boolean(s.playerId))
								.map((slot) => {
									return (
										<RegistrationSlotLineItemReview
											key={slot.id}
											slot={slot}
											team={slot.getTeamNumber(clubEvent.teamSize)}
											paymentDetails={payment.details}
											fees={clubEvent.fees}
										/>
									)
								})}
						<div className="text-primary mb-2 me-1 fw-bold" style={{ textAlign: "right" }}>
							Amount Due: ${amountDue.total.toFixed(2)}
						</div>
						<div className="mb-2">
							<span className="text-primary">Notes / Requests</span>
							<p className="fst-italic m-0">{registration?.notes ?? "No notes entered."}</p>
						</div>
						<hr />
						<div style={{ textAlign: "right" }}>
							<RegisterCountdown doCountdown={mode === "new"} />
							<button className="btn btn-secondary" disabled={isBusy} onClick={handleBack}>
								Back
							</button>
							<CancelButton mode={mode} />
							<button
								className="btn btn-primary ms-2"
								disabled={isBusy}
								onClick={handleRegistrationConfirm}
							>
								Continue
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
