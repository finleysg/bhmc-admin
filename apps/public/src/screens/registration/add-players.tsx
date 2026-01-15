import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { TypeaheadRef } from "react-bootstrap-typeahead"
import { toast } from "react-toastify"

import { MultiplePlayerPicker } from "../../components/directory/multiple-player-picker"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { useEventRegistrationSlots } from "../../hooks/use-event-registration-slots"
import { useOpenSlots } from "../../hooks/use-open-slots"
import { usePlayers } from "../../hooks/use-players"
import { useManageRegistration } from "./manage-registration"
import { RegistrationType } from "../../models/codes"
import type { Player } from "../../models/player"

export function AddPlayersScreen() {
	const { clubEvent, registration: currentRegistration } = useManageRegistration()
	const { editRegistration, initiateStripeSession, registration } = useEventRegistration()
	const { data: allPlayers = [], isLoading } = usePlayers()
	const { data: slots = [] } = useEventRegistrationSlots(clubEvent.id)
	const { data: openSlots = [] } = useOpenSlots(
		clubEvent.id,
		currentRegistration?.slots[0]?.holeId ?? 0,
		currentRegistration?.slots[0]?.startingOrder ?? 0,
	)
	const navigate = useNavigate()

	const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)
	const typeaheadRef = useRef<TypeaheadRef>(null)

	const deriveAvailableSlots = () => {
		if (clubEvent.canChoose) {
			return openSlots.length
		} else {
			const currentSlots = registration?.slots.filter((slot) => slot.playerId).length ?? 0
			return (clubEvent.maximumSignupGroupSize ?? 0) - currentSlots
		}
	}

	const availableSlots = deriveAvailableSlots()

	const isMembersOnly =
		clubEvent.registrationType === RegistrationType.MembersOnly ||
		clubEvent.registrationType === RegistrationType.ReturningMembersOnly

	const registeredPlayerIds = slots.map((slot) => slot.playerId).filter((id) => !!id)

	const handleConfirm = async () => {
		if (!currentRegistration || selectedPlayers.length === 0) return

		setIsSubmitting(true)
		try {
			await editRegistration(
				currentRegistration.id,
				selectedPlayers.map((p) => p.id),
			)
			initiateStripeSession()
			navigate("../../edit")
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to add players")
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleBack = () => {
		navigate("..")
	}

	if (availableSlots <= 0) {
		return (
			<div className="row">
				<div className="col-12 col-md-6">
					<div className="card border border-primary mb-4">
						<div className="card-body">
							<h4 className="card-header mb-2 text-primary">Add Players</h4>
							<p className="text-muted">No available slots to add players.</p>
							<hr />
							<div style={{ textAlign: "right" }}>
								<button className="btn btn-secondary" onClick={handleBack}>
									Back
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2 text-primary">Add Players</h4>
						<MultiplePlayerPicker
							selectedPlayers={selectedPlayers}
							onChange={setSelectedPlayers}
							players={allPlayers}
							isLoading={isLoading}
							excludeIds={registeredPlayerIds}
							membersOnly={isMembersOnly}
							limit={availableSlots}
							minChars={3}
							typeaheadRef={typeaheadRef}
							id="player-search-typeahead"
						/>
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
								className="btn btn-primary"
								onClick={handleConfirm}
								disabled={selectedPlayers.length === 0 || isSubmitting}
							>
								Continue
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
