import { ChangeEvent, useEffect, useState } from "react"

import { cloneDeep } from "lodash"

import { OverlaySpinner } from "../../components/spinners/overlay-spinner"
import { usePaymentData } from "../../hooks/use-payment-data"
import { ClubEvent } from "../../models/club-event"
import { EventFee } from "../../models/event-fee"
import { PaymentData } from "../../models/payment"
import { ReserveSlot } from "../../models/reserve"
import { RefundSlotDetail } from "./refund-slot-detail"

/**
 * Add a refund detail collection to each slot to be dropped.
 * @param {ReserveSlot[]} slots - the slots selected to be dropped
 * @param {PaymentReportData[]} payments - api payment data for the event
 * @param {Map<number, EventFee>} eventFees - fee details for the event
 * @returns
 */
const createRefundDetails = (
	slots: ReserveSlot[],
	payments: PaymentData[],
	eventFeeMap: Map<number, EventFee>,
) => {
	const transformedSlots: ReserveSlot[] = []
	const slotIds = slots.map((s) => s.id)
	const filteredPayments = payments.filter(
		(p) =>
			p.confirmed &&
			p.payment_details &&
			p.payment_details.some(
				(d) => d.registration_slot && slotIds.indexOf(d.registration_slot) >= 0,
			),
	)
	slots.forEach((slot) => {
		const newSlot = cloneDeep(slot)
		filteredPayments.forEach((payment) => {
			const paymentDetails = payment.payment_details
				? payment.payment_details.filter((d) => d.registration_slot === slot.id)
				: []
			paymentDetails.forEach((detail) => {
				if (detail.is_paid) {
					newSlot.fees.push({
						id: detail.id,
						eventFee: eventFeeMap.get(detail.event_fee)!,
						amountPaid: detail.amount ?? -1, // TODO: there should always be an amount
						paidBy: `TODO: derive user from id: ${payment.user}`,
						payment: payment,
						selected: true,
					})
				}
			})
		})
		transformedSlots.push(newSlot)
	})
	return transformedSlots
}

interface DropPlayersProps {
	clubEvent: ClubEvent
	slots: ReserveSlot[]
	onDrop: (slots: ReserveSlot[], notes: string) => void
	onRefund: (slots: ReserveSlot[], notes: string) => void
	onCancel: () => void
}

export function DropPlayers({ clubEvent, slots, onRefund, onDrop, onCancel }: DropPlayersProps) {
	const [dropSlots, setDropSlots] = useState<ReserveSlot[]>([])
	const [dropNotes, setDropNotes] = useState("")
	const { data: payments, status } = usePaymentData(clubEvent.id)

	useEffect(() => {
		if (payments && payments.length > 0) {
			const transformedSlots = createRefundDetails(slots, payments, clubEvent.feeMap)
			setDropSlots(transformedSlots)
		}
	}, [payments, slots, clubEvent])

	const refundAmount = () => {
		return dropSlots
			.flatMap((slot) => slot.fees)
			.filter((fee) => fee.selected)
			.reduce((acc, curr) => {
				return acc + curr.amountPaid
			}, 0)
	}

	const handleSelect = (paymentDetailId: number, selected: boolean) => {
		slots = dropSlots.slice(0)
		slots.forEach((slot) => {
			slot.fees.forEach((fee) => {
				if (fee.id === paymentDetailId) {
					fee.selected = selected
				}
			})
		})
		setDropSlots(slots)
	}

	const handleDrop = () => {
		onDrop(dropSlots, dropNotes)
	}

	const handleRefund = () => {
		onRefund(dropSlots, dropNotes)
	}

	const updateDropNotes = (e: ChangeEvent<HTMLTextAreaElement>) => {
		setDropNotes(e.target.value)
	}

	return (
		<div className="card border border-danger">
			<div className="card-body">
				<OverlaySpinner loading={status === "pending"} />
				<h4 className="card-header text-danger">Drop Players</h4>
				{dropSlots.map((slot) => {
					return <RefundSlotDetail key={slot.id} slot={slot} onSelect={handleSelect} />
				})}
				<div className="form-group mt-4 mb-2">
					<label htmlFor="refundNotes">Refund Notes</label>
					<textarea
						name="refundNotes"
						className="form-control"
						style={{ fontSize: ".9rem" }}
						onChange={updateDropNotes}
					/>
					<i className="form-group__bar"></i>
				</div>
				<div className="fw-bold text-danger-emphasis text-end">
					Refund amount: ${refundAmount()}
				</div>
				<div className="card-footer d-flex justify-content-end pb-0">
					<button className="btn btn-light me-2 mt-2" onClick={onCancel}>
						Cancel
					</button>
					<button className="btn btn-warning me-2 mt-2" onClick={handleRefund}>
						Refund Only
					</button>
					<button className="btn btn-danger mt-2" onClick={handleDrop}>
						Confirm Drop
					</button>
				</div>
			</div>
		</div>
	)
}
