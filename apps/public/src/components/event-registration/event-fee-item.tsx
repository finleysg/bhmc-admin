import { RegistrationMode } from "../../context/registration-reducer"
import { EventFee } from "../../models/event-fee"
import { EventFeeCheckbox } from "./event-fee-checkbox"

interface EventFeeItemProps {
	fee: EventFee
	playerAmount: number
	playerId?: number | null
	mode: RegistrationMode
	selected: boolean
	disabled: boolean
	onToggleFee: (fee: EventFee, isSelected: boolean) => void
}

export function EventFeeItem({
	fee,
	playerAmount,
	// mode,
	selected,
	disabled,
	onToggleFee,
}: EventFeeItemProps) {
	const isSelected = selected || fee.isRequired

	return (
		<div className="fee">
			<div className="fee-item fee-item--select">
				<EventFeeCheckbox
					isRequired={fee.isRequired}
					isSelected={isSelected}
					onChange={() => onToggleFee(fee, isSelected)}
					disabled={disabled || fee.isRequired}
				/>
			</div>
			<div className="fee-item fee-item--description">
				{fee.name} (${playerAmount})
			</div>
			<div className="fee-item fee-item--amount">
				${isSelected ? playerAmount.toFixed(2) : "0.00"}
			</div>
		</div>
	)
}
