import { EventFee } from "../../models/event-fee"
import { PaymentDetail } from "../../models/payment"
import { RegistrationSlot } from "../../models/registration"

interface PaymentDetailReviewProps {
	paymentDetail: PaymentDetail
	fees: EventFee[]
}

function PaymentDetailReview({ paymentDetail, fees }: PaymentDetailReviewProps) {
	const fee = fees.find((fee) => fee.id === paymentDetail.eventFeeId)

	if (fee) {
		return (
			<div className="mb-2" style={{ textAlign: "right" }}>
				{fee.name}: ${paymentDetail.amount.toFixed(2)}
			</div>
		)
	}
	return null
}

interface RegistrationSlotLineItemReviewProps {
	slot: RegistrationSlot
	team: number
	paymentDetails: PaymentDetail[]
	fees: EventFee[]
}

export function RegistrationSlotLineItemReview({
	slot,
	team,
	paymentDetails,
	fees,
}: RegistrationSlotLineItemReviewProps) {
	return (
		<div
			key={slot.id}
			className="d-flex justify-content-end mb-2 p-2 border-bottom border-success border-opacity-25"
		>
			<div className="flex-grow-1">
				<span className="text-success">{slot.playerName}</span>
				{team > 0 && <span className="text-success ms-1">- team {team}</span>}
			</div>
			<div>
				{paymentDetails
					.filter((detail) => detail.slotId === slot.id)
					.map((detail) => {
						return (
							<PaymentDetailReview
								key={`${detail.slotId}-${detail.id}`}
								paymentDetail={detail}
								fees={fees}
							/>
						)
					})}
			</div>
		</div>
	)
}
