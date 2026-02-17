"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { useRegistration } from "@/lib/registration/registration-context"
import { PaymentStep, RegisterStep, ReviewStep } from "@/lib/registration/registration-reducer"
import { calculateAmountDue } from "@/lib/registration/payment-utils"
import type { ServerRegistrationSlot } from "@/lib/registration/types"
import type { ClubEventDetail, EventFee } from "@/lib/types"
import { AmountDue } from "../components/amount-due"
import { CancelButton } from "../components/cancel-button"
import { FriendPicker } from "../components/friend-picker"
import { PlayerPicker } from "../components/player-picker"
import { RegistrationCountdown } from "../components/registration-countdown"
import { RegistrationPageWrapper } from "../components/registration-page-wrapper"
import { RegistrationStepHeader } from "../components/registration-step-header"
import { SlotGroup } from "../components/slot-group"
import { SlotLineItemReview } from "../components/slot-line-item-review"

export default function RegisterPage() {
	return (
		<RegistrationPageWrapper>
			{(event) => <RegisterContent event={event} />}
		</RegistrationPageWrapper>
	)
}

function RegisterContent({ event }: { event: ClubEventDetail }) {
	const router = useRouter()
	const eventUrl = getEventUrl(event)
	const { data: player } = useMyPlayer()
	const {
		currentStep,
		registration,
		payment,
		mode,
		error,
		addPlayer,
		canRegister,
		cancelRegistration,
		completeRegistration,
		createRegistration,
		initiateStripeSession,
		loadRegistration,
		savePayment,
		setError,
		updateRegistrationNotes,
		updateStep,
	} = useRegistration()

	const [notes, setNotes] = useState("")
	const [isBusy, setIsBusy] = useState(false)
	const [showPriorityDialog, setShowPriorityDialog] = useState(false)
	const loadedRef = useRef(false)

	// On mount: load existing registration or create one for non-can_choose events
	useEffect(() => {
		if (loadedRef.current || !player?.id) return
		loadedRef.current = true

		if (event.can_choose) {
			// Registration was created by the reserve page
			void loadRegistration(player.id)
		} else {
			// Non-can_choose: create registration on mount
			void createRegistration()
		}
	}, [event.can_choose, player?.id, loadRegistration, createRegistration])

	// Sync notes from loaded registration
	useEffect(() => {
		if (registration?.notes && !notes) {
			setNotes(registration.notes)
		}
	}, [registration?.notes, notes])

	// Show errors from context
	useEffect(() => {
		if (error) {
			toast.error(error)
			setError(null)
		}
	}, [error, setError])

	const feeMap = new Map<number, EventFee>(event.fees.map((f) => [f.id, f]))
	const amountDue = calculateAmountDue(payment?.details ?? [], feeMap)

	const showPickers = (event.maximum_signup_group_size ?? 0) > 1

	const handlePickPlayer = useCallback((slot: ServerRegistrationSlot) => {
		// Slot is already being passed to PlayerPicker via SlotGroup's onPickPlayer
		// This is handled by the picker components directly
		void slot
	}, [])

	const handlePlayerSelect = useCallback(
		(
			playerId: number,
			playerName: string,
			player: { birthDate: string | null; isMember: boolean; lastSeason: number | null },
		) => {
			const emptySlot = registration?.slots.find((s) => !s.player)
			if (emptySlot) {
				addPlayer(emptySlot, playerId, playerName, player)
			}
		},
		[registration?.slots, addPlayer],
	)

	const handleContinue = async () => {
		if (!canRegister()) {
			setShowPriorityDialog(true)
			return
		}

		setIsBusy(true)
		try {
			await updateRegistrationNotes(notes)
			await savePayment()
			updateStep(ReviewStep)
		} catch (err) {
			const message = err instanceof Error ? err.message : "An error occurred"
			toast.error(message)
		} finally {
			setIsBusy(false)
		}
	}

	const handleReviewBack = () => {
		updateStep(RegisterStep)
	}

	const handleReviewContinue = () => {
		if (amountDue.total === 0) {
			completeRegistration()
			toast.success("Registration complete!")
			router.push(eventUrl)
		} else {
			initiateStripeSession()
			updateStep(PaymentStep)
			router.push(`${eventUrl}/${payment!.id}/payment`)
		}
	}

	const handleExpired = useCallback(() => {
		void cancelRegistration("timeout", mode === "idle" ? "new" : mode)
		toast.error("Registration time expired")
		router.push(eventUrl)
	}, [cancelRegistration, eventUrl, mode, router])

	const handleCanceled = useCallback(() => {
		router.push(eventUrl)
	}, [eventUrl, router])

	const handlePriorityCancel = () => {
		setShowPriorityDialog(false)
		void cancelRegistration("violation", "new")
		router.push(eventUrl)
	}

	// Loading state
	if (!registration) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">Loading registration...</p>
				</CardContent>
			</Card>
		)
	}

	// Register step
	if (currentStep.name === "register") {
		const excludeIds = registration.slots.filter((s) => s.player).map((s) => s.player!.id)

		return (
			<div className="grid gap-6 md:grid-cols-12">
				<div className="md:col-span-8">
					<Card>
						<CardContent className="space-y-4 pt-6">
							<RegistrationStepHeader />

							<SlotGroup eventFees={event.fees} onPickPlayer={handlePickPlayer} />

							{showPickers && (
								<PlayerPicker
									eventId={event.id}
									onSelect={handlePlayerSelect}
									excludeIds={excludeIds}
								/>
							)}

							<div>
								<label htmlFor="notes" className="mb-1 block text-sm font-medium">
									Notes / Special Requests
								</label>
								<Textarea
									id="notes"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Enter any notes or special requests..."
									rows={3}
								/>
							</div>

							<AmountDue amountDue={amountDue} />

							{registration.expires && (
								<RegistrationCountdown expires={registration.expires} onExpired={handleExpired} />
							)}

							<div className="flex justify-end gap-2">
								<CancelButton mode="new" onCanceled={handleCanceled} />
								<Button onClick={() => void handleContinue()} disabled={isBusy}>
									{isBusy ? "Saving..." : "Continue"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{showPickers && (
					<div className="md:col-span-4">
						<FriendPicker onSelect={handlePlayerSelect} />
					</div>
				)}

				<AlertDialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Priority Registration</AlertDialogTitle>
							<AlertDialogDescription>
								During the priority registration period, you must register with at least{" "}
								{event.minimum_signup_group_size} players. Would you like to cancel and try again
								later?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Go Back</AlertDialogCancel>
							<AlertDialogAction variant="destructive" onClick={handlePriorityCancel}>
								Cancel Registration
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		)
	}

	// Review step
	if (currentStep.name === "review") {
		const filledSlots = registration.slots.filter((s) => s.player)
		const teamSize = event.team_size ?? 1

		return (
			<Card>
				<CardContent className="space-y-4 pt-6">
					<RegistrationStepHeader />

					<div className="space-y-1">
						{filledSlots.map((slot, index) => {
							const team = teamSize > 1 ? Math.floor(index / teamSize) + 1 : 0
							return (
								<SlotLineItemReview
									key={slot.id}
									slot={slot}
									fees={event.fees}
									paymentDetails={payment?.details ?? []}
									team={team}
								/>
							)
						})}
					</div>

					<div>
						<span className="text-sm font-medium">Notes / Requests</span>
						<p className="text-sm italic text-muted-foreground">
							{registration.notes ?? "No notes entered."}
						</p>
					</div>

					<AmountDue amountDue={amountDue} />

					{registration.expires && mode === "new" && (
						<RegistrationCountdown expires={registration.expires} onExpired={handleExpired} />
					)}

					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={handleReviewBack}>
							Back
						</Button>
						<CancelButton mode="new" onCanceled={handleCanceled} />
						<Button onClick={handleReviewContinue}>Continue</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	// Complete step — redirect
	useEffect(() => {
		if (currentStep.name === "complete") {
			toast.success("Registration complete!")
			router.push(eventUrl)
		}
	}, [currentStep.name, eventUrl, router])

	return null
}
