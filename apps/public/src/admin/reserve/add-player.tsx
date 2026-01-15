import { ChangeEvent, useState } from "react"

import { PeoplePicker } from "../../components/directory/people-picker"
import { Checkbox } from "../../components/forms/checkbox"
import { ClubEvent } from "../../models/club-event"
import { Player } from "../../models/player"
import { EventFeeDetail } from "./event-fee-detail"

interface AddPlayerProps {
	clubEvent: ClubEvent
	onAdd: (player: Player, feeIds: number[], isMoneyOwed: boolean, notes: string) => void
	onCancel: () => void
}

export function AddPlayer({ clubEvent, onAdd, onCancel }: AddPlayerProps) {
	const [newPlayer, setNewPlayer] = useState<Player | null>(null)
	const [selectedFees, setSelectedFees] = useState<number[]>([])
	const [collectingFees, setCollectingFees] = useState(true)
	const [notes, setNotes] = useState("")

	const calculateTotalFees = () => {
		let total = 0
		if (collectingFees) {
			clubEvent.fees.forEach((fee) => {
				if (selectedFees.includes(fee.id)) {
					total += fee.amount
				}
			})
		}
		return total
	}

	const handleSelect = (player: Player) => {
		setNewPlayer(player)
	}

	const handleAdd = () => {
		if (newPlayer) {
			onAdd(newPlayer, selectedFees, collectingFees, notes)
			setNewPlayer(null)
			setSelectedFees([])
			setNotes("")
		}
	}

	const handleCancel = () => {
		setNewPlayer(null)
		setSelectedFees([])
		setNotes("")
		onCancel()
	}

	const handleToggleFee = (eventFeeId: number, selected: boolean) => {
		const fees = selectedFees.slice()
		if (selected) {
			fees.push(eventFeeId)
		} else {
			const index = fees.indexOf(eventFeeId)
			if (index > -1) {
				fees.splice(index, 1)
			}
		}
		setSelectedFees(fees)
		calculateTotalFees()
	}

	const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		const notes = e.target.value
		setNotes(notes)
	}

	return (
		<div className="card border border-info">
			<div className="card-body">
				<h4 className="card-header text-info mb-2">Add Player to {clubEvent.name}</h4>
				<PeoplePicker allowNew={false} clubEvent={clubEvent} onSelect={handleSelect} />
				<p className="mt-2 fw-bold text-info-emphasis">
					Selected player: {newPlayer ? newPlayer.name : "none selected"}
				</p>
				<div>
					{clubEvent.fees.map((fee) => {
						return (
							<EventFeeDetail
								key={fee.id}
								eventFee={fee}
								selected={selectedFees.includes(fee.id)}
								onSelect={handleToggleFee}
							/>
						)
					})}
				</div>
				<div className="form-group mt-4 mb-2">
					<Checkbox
						label="Are we collecting fees?"
						checked={collectingFees}
						onChange={() => setCollectingFees(!collectingFees)}
					/>
				</div>
				<div className="form-group mb-2">
					<label htmlFor="notes">Notes / Payment Information</label>
					<textarea
						id="notes"
						name="notes"
						className="form-control fc-alt"
						value={notes}
						onChange={handleNotesChange}
						rows={3}
					></textarea>
				</div>
				<div className="fw-bold text-info-emphasis text-end">
					Amount owed: ${calculateTotalFees().toFixed(2)}
				</div>
				<div className="card-footer d-flex justify-content-end pb-0">
					<button className="btn btn-light btn-sm me-2 mt-2" onClick={handleCancel}>
						Cancel
					</button>
					<button disabled={!newPlayer} className="btn btn-info btn-sm mt-2" onClick={handleAdd}>
						Confirm Add
					</button>
				</div>
			</div>
		</div>
	)
}
