"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { useRegistration } from "@/lib/registration/registration-context"
import { calculateAmountDue } from "@/lib/registration/payment-utils"
import { PaymentStep, RegisterStep, ReviewStep } from "@/lib/registration/registration-reducer"
import type { ClubEventDetail, EventFee } from "@/lib/types"
import { AmountDue } from "../components/amount-due"
import { CancelButton } from "../components/cancel-button"
import { RegistrationPageWrapper } from "../components/registration-page-wrapper"
import { RegistrationStepHeader } from "../components/registration-step-header"
import { SlotGroup } from "../components/slot-group"
import { SlotLineItemReview } from "../components/slot-line-item-review"

export default function EditPage() {
	return (
		<RegistrationPageWrapper>{(event) => <EditContent event={event} />}</RegistrationPageWrapper>
	)
}

function EditContent({ event }: { event: ClubEventDetail }) {
	const router = useRouter()
	const eventUrl = getEventUrl(event)
	const { data: player } = useMyPlayer()
	const {
		currentStep,
		registration,
		payment,
		error,
		loadRegistration,
		initiateStripeSession,
		savePayment,
		setError,
		updateRegistrationNotes,
		updateStep,
		completeRegistration,
	} = useRegistration()

	const [notes, setNotes] = useState("")
	const [isBusy, setIsBusy] = useState(false)
	const loadedRef = useRef(false)

	// On mount: load existing registration
	useEffect(() => {
		if (loadedRef.current || !player?.id) return
		loadedRef.current = true
		void loadRegistration(player.id)
	}, [player?.id, loadRegistration])

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

	// In edit mode, players are already assigned — no picking needed
	const handlePickPlayer = useCallback(() => {}, [])

	const handleContinue = async () => {
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
			toast.success("Registration updated!")
			router.push(eventUrl)
		} else {
			initiateStripeSession()
			updateStep(PaymentStep)
			router.push(`${eventUrl}/${payment!.id}/payment`)
		}
	}

	const handleCanceled = useCallback(() => {
		router.push(eventUrl)
	}, [eventUrl, router])

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

	// Edit step (uses register step name from reducer)
	if (currentStep.name === "register") {
		return (
			<Card>
				<CardContent className="space-y-4 pt-6">
					<RegistrationStepHeader />

					<SlotGroup eventFees={event.fees} onPickPlayer={handlePickPlayer} />

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

					<div className="flex justify-end gap-2">
						<CancelButton mode="edit" onCanceled={handleCanceled} />
						<Button onClick={() => void handleContinue()} disabled={isBusy}>
							{isBusy ? "Saving..." : "Continue"}
						</Button>
					</div>
				</CardContent>
			</Card>
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

					<div className="flex justify-end gap-2">
						<Button variant="secondary" onClick={handleReviewBack}>
							Back
						</Button>
						<CancelButton mode="edit" onCanceled={handleCanceled} />
						<Button onClick={handleReviewContinue}>Continue</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	// Complete step — redirect
	useEffect(() => {
		if (currentStep.name === "complete") {
			toast.success("Registration updated!")
			router.push(eventUrl)
		}
	}, [currentStep.name, eventUrl, router])

	return null
}
