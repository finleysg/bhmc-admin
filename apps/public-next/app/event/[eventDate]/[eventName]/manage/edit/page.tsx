"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getEventUrl } from "@/lib/event-utils"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePlayerRegistration } from "@/lib/hooks/use-player-registration"
import { calculateAmountDue } from "@/lib/registration/payment-utils"
import { useRegistration } from "@/lib/registration/registration-context"
import { ReviewStep } from "@/lib/registration/registration-reducer"
import { AmountDue } from "../../components/amount-due"
import { CancelButton } from "../../components/cancel-button"
import { SlotGroup } from "../../components/slot-group"

export default function EditRegistrationPage() {
	const router = useRouter()
	const {
		clubEvent,
		registration: contextRegistration,
		payment,
		error,
		startEditRegistration,
		initiateStripeSession,
		savePayment,
		setError,
		updateRegistrationNotes,
		updateStep,
	} = useRegistration()
	const { data: player } = useMyPlayer()
	const { data: registrationData } = usePlayerRegistration(clubEvent?.id, player?.id)
	const initiated = useRef(false)

	const registrationId = registrationData?.registration?.id

	// Initialize edit mode: fetch full registration (with fees) from NestJS API,
	// then load into context. The usePlayerRegistration hook fetches from Django
	// which does not include fees per slot.
	useEffect(() => {
		if (!clubEvent || !registrationId || initiated.current) return
		initiated.current = true

		fetch(`/api/registration/${registrationId}`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load registration")
				return res.json() as Promise<import("@/lib/registration/types").ServerRegistration>
			})
			.then((registration) => {
				startEditRegistration(registration)
				initiateStripeSession()
			})
			.catch((err) => {
				setError((err as Error).message)
			})
	}, [clubEvent, registrationId, startEditRegistration, initiateStripeSession, setError])

	const [notes, setNotes] = useState(contextRegistration?.notes ?? "")
	const [isContinuing, setIsContinuing] = useState(false)

	// Sync notes when registration loads into context
	useEffect(() => {
		if (contextRegistration?.notes && !notes) {
			setNotes(contextRegistration.notes)
		}
	}, [contextRegistration?.notes, notes])

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

	const feeCount = clubEvent?.fees?.length ?? 0
	const layout =
		clubEvent?.maximum_signup_group_size === 1 || feeCount > 5 ? "vertical" : "horizontal"
	const fees = clubEvent?.fees ?? []

	const feeMap = useMemo(() => new Map(clubEvent?.fees.map((f) => [f.id, f])), [clubEvent?.fees])
	const amountDue = useMemo(
		() => calculateAmountDue(payment?.details ?? [], feeMap),
		[payment, feeMap],
	)

	const handleContinue = useCallback(async () => {
		setIsContinuing(true)
		try {
			await updateRegistrationNotes(notes)
			await savePayment()
			updateStep(ReviewStep)
			router.replace(`${getEventUrl(clubEvent!)}/review`)
		} catch {
			// Error handled by provider
		} finally {
			setIsContinuing(false)
		}
	}, [notes, updateRegistrationNotes, savePayment, updateStep, router, clubEvent])

	const handleCanceled = useCallback(() => {
		router.replace(clubEvent ? `${getEventUrl(clubEvent)}/manage` : "../")
	}, [clubEvent, router])

	// No-op for slot group's onPickPlayer — players are fixed in edit mode
	const handlePickPlayer = useCallback(() => {}, [])

	// Show loading state until context registration is populated
	if (!contextRegistration || !clubEvent) {
		return (
			<div className="max-w-[560px]">
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Edit Registration</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">Loading registration...</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="max-w-[560px]">
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Edit Registration</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Error */}
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="size-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{/* Fee grid */}
					<SlotGroup layout={layout} eventFees={fees} onPickPlayer={handlePickPlayer} readOnly />

					{/* Amount due */}
					<AmountDue amountDue={amountDue} />

					<Separator />

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor="registration-notes">Notes / Special Requests</Label>
						<Textarea
							id="registration-notes"
							placeholder="Any special requests or notes for this registration..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
						/>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col gap-4">
					<div className="flex w-full justify-end gap-2">
						<CancelButton mode="edit" onCanceled={handleCanceled} />
						<Button onClick={() => void handleContinue()} disabled={isContinuing}>
							{isContinuing ? "Saving..." : "Continue"}
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
