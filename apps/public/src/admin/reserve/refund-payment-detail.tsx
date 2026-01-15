import { ChangeEvent } from "react"

import { Checkbox } from "../../components/forms/checkbox"
import { Refund } from "../../models/refund"

interface RefundPaymentDetailProps {
	refundFee: Refund
	onSelect: (paymentDetailId: number, selected: boolean) => void
}

export function RefundPaymentDetail({ refundFee, onSelect }: RefundPaymentDetailProps) {
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		onSelect(refundFee.id, e.target.checked)
	}

	const feeInfo = `${refundFee.eventFee?.name}: $${refundFee.amountPaid.toFixed(2)}`

	return (
		<div className="mb-1">
			<Checkbox label={feeInfo} checked={refundFee.selected} onChange={handleChange} />
		</div>
	)
}
