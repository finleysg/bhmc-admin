import { ChangeEvent } from "react"

import { Checkbox } from "../../components/forms/checkbox"
import { EventFee } from "../../models/event-fee"

interface EventFeeDetailProps {
	eventFee: EventFee
	selected: boolean
	onSelect: (eventFeeId: number, selected: boolean) => void
}

export function EventFeeDetail({ eventFee, selected, onSelect }: EventFeeDetailProps) {
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		onSelect(eventFee.id, e.target.checked)
	}

	const feeInfo = `${eventFee.name}: $${eventFee.amount.toFixed(2)}`

	return (
		<div className="mb-1">
			<Checkbox label={feeInfo} checked={selected} onChange={handleChange} />
		</div>
	)
}
