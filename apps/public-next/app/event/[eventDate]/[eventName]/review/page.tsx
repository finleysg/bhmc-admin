"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getEventUrl } from "@/lib/event-utils"
import { calculateAmountDue } from "@/lib/registration/payment-utils"
import { useRegistration } from "@/lib/registration/registration-context"
import {
	CompleteStep,
	PaymentStep,
	RegisterStep,
} from "@/lib/registration/registration-reducer"
import { AmountDue } from "../components/amount-due"
import { CancelButton } from "../components/cancel-button"
import { RegistrationCountdown } from "../components/registration-countdown"
import { ReviewSlotLineItem } from "../components/review-slot-line-item"

export default function ReviewPage() {
	const router = useRouter()
	const {
		clubEvent,
		currentStep,
		registration,
		payment,
		mode,
		error,
		selectedStart,
		setError,
		updateStep,
		completeRegistration,
	} = useRegistration()

	// Redirect if no registration
	useEffect(() => {
		if (!registration) {
			router.replace(clubEvent ? getEventUrl(clubEvent) : "../")
		}
	}, [registration, clubEvent, router])

	// Auto-dismiss error after 5 seconds
	const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	useEffect(() => {
		if (error) {
			if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
			errorTimerRef.current = setTimeout(() => setError(null), 5000)
		}
		return () => {
			if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
		}
	}, [error, setError])

	const feeMap = useMemo(() => new Map(clubEvent?.fees.map((f) => [f.id, f])), [clubEvent?.fees])
	const amountDue = useMemo(
		() => calculateAmountDue(payment?.details ?? [], feeMap),
		[payment, feeMap],
	)

	const slotsWithPlayers = useMemo(
		() => registration?.slots.filter((s) => s.player) ?? [],
		[registration?.slots],
	)

	const handleBack = useCallback(() => {
		updateStep(RegisterStep)
		if (mode === "edit") {
			router.replace(`${getEventUrl(clubEvent!)}/edit`)
		} else {
			router.replace(`${getEventUrl(clubEvent!)}/register`)
		}
	}, [updateStep, mode, router, clubEvent])

	const handleContinue = useCallback(() => {
		if (amountDue.total > 0) {
			updateStep(PaymentStep)
			router.replace(`${getEventUrl(clubEvent!)}/${payment?.id}/payment`)
		} else {
			updateStep(CompleteStep)
			completeRegistration()
			router.replace(getEventUrl(clubEvent!))
		}
	}, [amountDue, updateStep, router, clubEvent, payment, completeRegistration])

	const handleExpired = useCallback(() => {
		toast.error("Registration expired. Please try again.")
		router.replace(clubEvent ? getEventUrl(clubEvent) : "../")
	}, [clubEvent, router])

	const handleCanceled = useCallback(() => {
		router.replace(clubEvent ? getEventUrl(clubEvent) : "../")
	}, [clubEvent, router])

	if (!registration || !clubEvent || !payment) return null

	const teamSize = clubEvent.team_size ?? 1
	const fees = clubEvent.fees

	return (
		<Card className="md:max-w-[60%]">
			<CardHeader>
				<CardTitle className="text-lg">{currentStep.title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Selected start */}
				{selectedStart && (
					<p className="text-sm italic text-blue-600 dark:text-blue-400">{selectedStart}</p>
				)}

				{/* Error */}
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="size-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{/* Player / fee line items */}
				<div>
					{slotsWithPlayers.map((slot) => {
						const team =
							teamSize > 1 ? Math.floor(slot.slot / teamSize) + 1 : 0
						return (
							<ReviewSlotLineItem
								key={slot.id}
								slot={slot}
								team={team}
								paymentDetails={payment.details}
								fees={fees}
							/>
						)
					})}
				</div>

				{/* Amount due */}
				<AmountDue amountDue={amountDue} />

				<Separator />

				{/* Notes */}
				<div>
					<p className="text-sm font-medium">Notes / Requests</p>
					<p className="text-sm italic text-muted-foreground">
						{registration.notes || "No notes entered."}
					</p>
				</div>
			</CardContent>
			<CardFooter className="flex flex-col gap-4">
				{/* Countdown */}
				{mode === "new" && registration.expires && (
					<RegistrationCountdown expires={registration.expires} onExpired={handleExpired} />
				)}

				{/* Actions */}
				<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<CancelButton mode={mode} onCanceled={handleCanceled} />
					<Button variant="outline" onClick={handleBack}>
						Back
					</Button>
					<Button onClick={handleContinue}>Continue</Button>
				</div>
			</CardFooter>
		</Card>
	)
}
