import { useState } from "react"

import { useNavigate } from "react-router-dom"

import { RegistrationMode } from "../../context/registration-reducer"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { ConfirmDialog } from "../dialog/confirm"

export function CancelButton({
	mode,
	onCanceled,
}: {
	mode: RegistrationMode
	onCanceled?: () => void
}) {
	const [showCancelDialog, setShowCancelDialog] = useState(false)
	const { cancelRegistration, currentStep } = useEventRegistration()
	const navigate = useNavigate()

	const dialogTitle = mode === "new" ? "Cancel Registration?" : "Cancel Changes?"
	const dialogMessage =
		mode === "new"
			? "Cancel this registration and return to the event detail page."
			: "Cancel these changes and return to the event detail page."

	const handleCancel = () => {
		setShowCancelDialog(false)
		// Navigate FIRST, before cancelRegistration clears state
		// (otherwise useEventRegistrationGuard's useLayoutEffect fires and navigates to wrong route)
		if (onCanceled) {
			onCanceled()
		} else {
			if (currentStep.name === "payment") {
				navigate("../../")
			} else {
				navigate("../")
			}
		}
		// Fire and forget - we've already navigated
		cancelRegistration("user", mode)
	}

	return (
		<>
			<button className="btn btn-secondary ms-2" onClick={() => setShowCancelDialog(true)}>
				Cancel
			</button>
			<ConfirmDialog
				show={showCancelDialog}
				title={dialogTitle}
				message={dialogMessage}
				onClose={(result) => (result ? handleCancel() : setShowCancelDialog(false))}
			/>
		</>
	)
}
