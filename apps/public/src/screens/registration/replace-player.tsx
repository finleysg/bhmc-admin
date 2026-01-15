import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { MultiplePlayerPicker } from "../../components/directory/multiple-player-picker"
import { RegisteredPlayerSelector } from "../../components/event-registration/registered-player-selector"
import { useEventRegistrationSlots } from "../../hooks/use-event-registration-slots"
import { usePlayers } from "../../hooks/use-players"
import { useManageRegistration } from "./manage-registration"
import { useSwapPlayers } from "../../hooks/use-swap-players"
import { RegistrationType } from "../../models/codes"
import type { Player } from "../../models/player"
import { RegistrationSlot } from "../../models/registration"

export function ReplacePlayerScreen() {
	const { clubEvent, registration: currentRegistration } = useManageRegistration()
	const { data: allPlayers = [], isLoading } = usePlayers()
	const { data: slots = [] } = useEventRegistrationSlots(clubEvent.id)
	const swapPlayers = useSwapPlayers()
	const navigate = useNavigate()

	const [sourcePlayerId, setSourcePlayerId] = useState<number | null>(null)
	const [targetPlayer, setTargetPlayer] = useState<Player | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const isMembersOnly =
		clubEvent.registrationType === RegistrationType.MembersOnly ||
		clubEvent.registrationType === RegistrationType.ReturningMembersOnly

	const registeredPlayerIds = slots.map((slot) => slot.playerId).filter((id) => !!id)

	const handleSourceChange = (playerIds: number[]) => {
		setSourcePlayerId(playerIds[0] ?? null)
	}

	const handleTargetChange = (players: Player[]) => {
		setTargetPlayer(players[0] ?? null)
	}

	const handleReplace = async () => {
		if (!sourcePlayerId || !targetPlayer) return

		const slot = currentRegistration.slots.find(
			(s: RegistrationSlot) => s.playerId === sourcePlayerId,
		)
		if (!slot) return

		setIsSubmitting(true)
		try {
			await swapPlayers.mutateAsync({ slotId: slot.id, playerId: targetPlayer.id })
			toast.success(`${slot.playerName} replaced by ${targetPlayer.name}`)
			navigate("../")
		} catch (error: unknown) {
			toast.error(error instanceof Error ? error.message : "Failed to replace player")
			setIsSubmitting(false)
		}
	}

	const handleBack = () => {
		navigate("..")
	}

	const canReplace = sourcePlayerId !== null && targetPlayer !== null

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2 text-primary">Replace Player</h4>
						<div className="mb-4">
							<div className="form-label fw-semibold">Player to replace</div>
							<RegisteredPlayerSelector
								registration={currentRegistration}
								limit={1}
								onChange={handleSourceChange}
							/>
						</div>
						<div className="mb-4">
							<div className="form-label fw-semibold">Replacement player</div>
							<MultiplePlayerPicker
								selectedPlayers={targetPlayer ? [targetPlayer] : []}
								onChange={handleTargetChange}
								players={allPlayers}
								isLoading={isLoading}
								excludeIds={registeredPlayerIds}
								membersOnly={isMembersOnly}
								limit={1}
								id="replace-player-picker"
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
								className="btn btn-primary"
								onClick={handleReplace}
								disabled={!canReplace || isSubmitting}
							>
								Replace
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
