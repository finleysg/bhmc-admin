import { formatCurrency } from "@/lib/registration/payment-utils"
import type { ServerPaymentDetail, ServerRegistrationSlot } from "@/lib/registration/types"
import type { EventFee } from "@/lib/types"

interface ReviewSlotLineItemProps {
	slot: ServerRegistrationSlot
	team: number
	paymentDetails: ServerPaymentDetail[]
	fees: EventFee[]
}

export function ReviewSlotLineItem({ slot, team, paymentDetails, fees }: ReviewSlotLineItemProps) {
	const slotDetails = paymentDetails.filter((d) => d.registrationSlotId === slot.id)

	return (
		<div className="flex justify-between gap-4 border-b border-emerald-600/25 p-2">
			<div className="shrink-0">
				<span className="font-medium text-emerald-600 dark:text-emerald-400">
					{slot.player?.firstName} {slot.player?.lastName}
				</span>
				{team > 0 && (
					<span className="ml-1 text-emerald-600 dark:text-emerald-400">- team {team}</span>
				)}
			</div>
			<div className="space-y-1 text-right text-sm">
				{slotDetails.map((detail) => {
					const fee = fees.find((f) => f.id === detail.eventFeeId)
					if (!fee) return null
					return (
						<div key={`${detail.registrationSlotId}-${detail.id}`}>
							{fee.fee_type.name}: {formatCurrency(detail.amount ?? 0)}
						</div>
					)
				})}
			</div>
		</div>
	)
}
