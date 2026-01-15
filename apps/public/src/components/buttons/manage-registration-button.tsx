import { ComponentPropsWithoutRef } from "react"

import { ClubEventProps } from "../../models/common-props"

interface ManageRegistrationButtonProps extends ComponentPropsWithoutRef<"button"> {
	hasSignedUp: boolean
}

export function ManageRegistrationButton({
	clubEvent,
	hasSignedUp,
	onClick,
	...rest
}: ManageRegistrationButtonProps & ClubEventProps) {
	if (hasSignedUp && clubEvent.canEditRegistration() && clubEvent.paymentsAreOpen()) {
		return (
			<button className="btn btn-warning btn-sm" onClick={onClick} {...rest}>
				Manage
			</button>
		)
	}
	return null
}
