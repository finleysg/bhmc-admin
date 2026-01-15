import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { ConfirmDialog } from "../../components/dialog/confirm"
import { RegisteredPlayerSelector } from "../../components/event-registration/registered-player-selector"
import { useDropPlayers } from "../../hooks/use-drop-players"
import { useMyPlayerRecord } from "../../hooks/use-my-player-record"
import { useManageRegistration } from "./manage-registration"

export function DropPlayersScreen() {
	const { registration: currentRegistration } = useManageRegistration()
	const { data: player } = useMyPlayerRecord()
	const dropPlayers = useDropPlayers()
	const navigate = useNavigate()

	const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([])
	const [showConfirm, setShowConfirm] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleDrop = async () => {
		if (selectedPlayerIds.length === 0) return

		const slotIds = currentRegistration.slots
			.filter((slot) => selectedPlayerIds.includes(slot.playerId))
			.map((slot) => slot.id)

		if (slotIds.length === 0) return

		setIsSubmitting(true)
		try {
			await dropPlayers.mutateAsync({ registrationId: currentRegistration.id, slotIds })
			toast.success(`${slotIds.length} player(s) dropped`)

			const totalPlayers = currentRegistration.slots.filter((s) => s.playerId).length
			const remainingPlayers = totalPlayers - selectedPlayerIds.length
			const isDroppingMyself = player && selectedPlayerIds.includes(player.id)

			if (remainingPlayers === 0 || isDroppingMyself) {
				navigate("../..") // event screen
			} else {
				navigate("../") // manage menu
			}
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to drop players")
			setIsSubmitting(false)
		}
	}

	const handleConfirmClose = (confirmed: boolean) => {
		setShowConfirm(false)
		if (confirmed) {
			handleDrop()
		}
	}

	const handleBack = () => {
		navigate("..")
	}

	const canDrop = selectedPlayerIds.length > 0

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2 text-primary">Drop Players</h4>
						<div className="mb-4">
							<div className="form-label fw-semibold">Select players to drop</div>
							<RegisteredPlayerSelector
								registration={currentRegistration}
								onChange={setSelectedPlayerIds}
							/>
						</div>
						<hr />
						<div style={{ textAlign: "right" }}>
							<button
								className="btn btn-secondary me-2"
								onClick={handleBack}
								disabled={isSubmitting}
							>
								Back
							</button>
							<button
								className="btn btn-danger"
								onClick={() => setShowConfirm(true)}
								disabled={!canDrop || isSubmitting}
							>
								Drop
							</button>
						</div>
					</div>
				</div>
				<ConfirmDialog
					title="Drop Players"
					message={`Are you sure you want to remove ${selectedPlayerIds.length} player(s) from your group?`}
					show={showConfirm}
					onClose={handleConfirmClose}
				/>
			</div>
		</div>
	)
}
