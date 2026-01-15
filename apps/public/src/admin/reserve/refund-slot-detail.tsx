import { ReserveSlot } from "../../models/reserve"
import { RefundPaymentDetail } from "./refund-payment-detail"

interface RefundSlotDetailProps {
	slot: ReserveSlot
	onSelect: (paymentDetailId: number, selected: boolean) => void
}

export function RefundSlotDetail({ slot, onSelect }: RefundSlotDetailProps) {
	return (
		<div key={slot.id} className="d-flex flex-row justify-content-start mb-2 p-2">
			<div style={{ flex: 1 }}>{slot.playerName}</div>
			<div style={{ flex: 3 }}>
				{slot.fees.map((fee) => {
					return <RefundPaymentDetail key={`${fee.id}`} refundFee={fee} onSelect={onSelect} />
				})}
			</div>
		</div>
	)
}
