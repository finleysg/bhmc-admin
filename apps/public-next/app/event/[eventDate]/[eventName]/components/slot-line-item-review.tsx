import type { ServerPaymentDetail, ServerRegistrationSlot } from "@/lib/registration/types"
import type { EventFee } from "@/lib/types"

interface SlotLineItemReviewProps {
	slot: ServerRegistrationSlot
	fees: EventFee[]
	paymentDetails: ServerPaymentDetail[]
	team: number
}

export function SlotLineItemReview({ slot, fees, paymentDetails, team }: SlotLineItemReviewProps) {
	const slotDetails = paymentDetails.filter((d) => d.registrationSlotId === slot.id)

	return (
		<div className="flex items-start justify-between border-b border-border/50 py-2">
			<div className="flex-1">
				<span className="font-medium text-primary">
					{slot.player?.firstName} {slot.player?.lastName}
				</span>
				{team > 0 && <span className="ml-1 text-muted-foreground">- team {team}</span>}
			</div>
			<div className="text-right">
				{slotDetails.map((detail) => {
					const fee = fees.find((f) => f.id === detail.eventFeeId)
					if (!fee) return null
					return (
						<div key={`${detail.registrationSlotId}-${detail.eventFeeId}`} className="text-sm">
							{fee.fee_type.name}: ${(detail.amount ?? 0).toFixed(2)}
						</div>
					)
				})}
			</div>
		</div>
	)
}
