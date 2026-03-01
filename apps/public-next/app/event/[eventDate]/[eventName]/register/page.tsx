"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getEventUrl } from "@/lib/event-utils"
import { useAddFriend } from "@/lib/hooks/use-my-friends"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import type { FeePlayer } from "@/lib/registration/fee-utils"
import { calculateAmountDue } from "@/lib/registration/payment-utils"
import { useRegistration } from "@/lib/registration/registration-context"
import { ReviewStep } from "@/lib/registration/registration-reducer"
import type { ServerRegistrationSlot } from "@/lib/registration/types"
import { AmountDue } from "../components/amount-due"
import { CancelButton } from "../components/cancel-button"
import { FriendPicker } from "../components/friend-picker"
import { PlayerPicker } from "../components/player-picker"
import { RegistrationCountdown } from "../components/registration-countdown"
import { SlotGroup } from "../components/slot-group"

export default function RegisterPage() {
	const router = useRouter()
	const {
		clubEvent,
		registration,
		payment,
		mode,
		error,
		selectedStart,
		addPlayer,
		canRegister,
		cancelRegistration,
		savePayment,
		setError,
		updateRegistrationNotes,
		updateStep,
	} = useRegistration()

	const { data: myPlayer } = useMyPlayer()
	const { mutate: addFriendMutation } = useAddFriend(myPlayer?.id)

	const [notes, setNotes] = useState(registration?.notes ?? "")
	const [showPriorityDialog, setShowPriorityDialog] = useState(false)
	const [isContinuing, setIsContinuing] = useState(false)

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

	// Computed values
	const feeCount = clubEvent?.fees?.length ?? 0
	const layout =
		clubEvent?.maximum_signup_group_size === 1 || feeCount > 5 ? "vertical" : "horizontal"
	const showPickers = (clubEvent?.maximum_signup_group_size ?? 0) > 1
	const fees = clubEvent?.fees ?? []

	const feeMap = useMemo(() => new Map(clubEvent?.fees.map((f) => [f.id, f])), [clubEvent?.fees])
	const amountDue = useMemo(
		() => calculateAmountDue(payment?.details ?? [], feeMap),
		[payment, feeMap],
	)

	const excludeIds = useMemo(
		() => registration?.slots.filter((s) => s.player).map((s) => s.player!.id) ?? [],
		[registration?.slots],
	)

	// Find first empty slot
	const findEmptySlot = useCallback((): ServerRegistrationSlot | undefined => {
		return registration?.slots.find((s) => !s.player)
	}, [registration?.slots])

	// Handle adding a player (from search or friend picker)
	const handleAddPlayer = useCallback(
		(playerId: number, playerName: string, player: FeePlayer) => {
			const emptySlot = findEmptySlot()
			if (!emptySlot) {
				setError("All player slots are filled.")
				return
			}
			addPlayer(emptySlot, playerId, playerName, player)
			addFriendMutation(playerId)
		},
		[findEmptySlot, addPlayer, addFriendMutation, setError],
	)

	// Handle picking a player for a specific slot (from "Add a player" link)
	// Currently a no-op since PlayerPicker always targets the first empty slot
	const handlePickPlayer = useCallback(() => {}, [])

	// Handle continue
	const handleContinue = useCallback(async () => {
		if (!canRegister()) {
			setShowPriorityDialog(true)
			return
		}
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
	}, [canRegister, notes, updateRegistrationNotes, savePayment, updateStep, router])

	// Handle expiration
	const handleExpired = useCallback(() => {
		void cancelRegistration("timeout", "new").then(() => {
			toast.error("Registration expired. Please try again.")
			router.replace(getEventUrl(clubEvent!))
		})
	}, [cancelRegistration, clubEvent, router])

	// Handle cancel
	const handleCanceled = useCallback(() => {
		router.replace(getEventUrl(clubEvent!))
	}, [clubEvent, router])

	// Handle priority dialog close
	const handlePriorityClose = useCallback(() => {
		setShowPriorityDialog(false)
		void cancelRegistration("violation", "new").then(() => {
			router.replace(getEventUrl(clubEvent!))
		})
	}, [cancelRegistration, clubEvent, router])

	if (!registration || !clubEvent) return null

	const minGroup = clubEvent.minimum_signup_group_size ?? 1
	const maxGroup = clubEvent.maximum_signup_group_size ?? 1

	return (
		<>
			<div className="grid gap-6 md:grid-cols-[560px_16rem]">
				{/* Main card */}
				<Card>
					<CardHeader>
						<div className="flex items-start justify-between gap-4">
							<CardTitle className="text-lg">Players and Fees</CardTitle>
							{showPickers && clubEvent && (
								<div className="w-64 shrink-0">
									<PlayerPicker
										eventId={clubEvent.id}
										onSelect={handleAddPlayer}
										excludeIds={excludeIds}
									/>
								</div>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Subtitle row */}
						<div className="flex items-center justify-between">
							{selectedStart && (
								<p className="text-sm italic text-blue-600 dark:text-blue-400">{selectedStart}</p>
							)}
							{showPickers && (
								<div className="md:hidden">
									<FriendPicker onSelect={handleAddPlayer} excludeIds={excludeIds} />
								</div>
							)}
						</div>

						{/* Error */}
						{error && (
							<Alert variant="destructive">
								<AlertCircle className="size-4" />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{/* Fee grid */}
						<SlotGroup layout={layout} eventFees={fees} onPickPlayer={handlePickPlayer} />

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
						{/* Countdown */}
						{registration.expires && (
							<RegistrationCountdown expires={registration.expires} onExpired={handleExpired} />
						)}

						{/* Actions */}
						<div className="flex w-full justify-end gap-2">
							<CancelButton mode={mode} onCanceled={handleCanceled} />
							<Button onClick={() => void handleContinue()} disabled={isContinuing}>
								{isContinuing ? "Saving..." : "Continue"}
							</Button>
						</div>
					</CardFooter>
				</Card>

				{/* Sidebar: Friend picker (desktop only) */}
				{showPickers && (
					<div className="hidden md:block">
						<FriendPicker onSelect={handleAddPlayer} excludeIds={excludeIds} />
					</div>
				)}
			</div>

			{/* Priority registration violation dialog */}
			<AlertDialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Priority Registration</AlertDialogTitle>
						<AlertDialogDescription>
							During the priority registration period, you must have {minGroup} to {maxGroup}{" "}
							players to register. Please wait until sign ups open for twosomes and singles.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={handlePriorityClose}>OK</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
