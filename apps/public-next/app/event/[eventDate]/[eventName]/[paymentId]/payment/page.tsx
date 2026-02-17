"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"

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
import { getEventUrl } from "@/lib/event-utils"
import { useAuth } from "@/lib/auth-context"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { useMyPlayer } from "@/lib/hooks/use-my-player"
import { usePaymentTimeout } from "@/lib/hooks/use-payment-timeout"
import { useRegistration } from "@/lib/registration/registration-context"
import {
	PaymentStep as PaymentStepConst,
	ReviewStep,
} from "@/lib/registration/registration-reducer"
import { formatCurrency } from "@/lib/registration/payment-utils"
import { RegistrationCountdown } from "../../components/registration-countdown"
import { useCurrentPaymentAmount } from "../layout"

export default function PaymentPage() {
	const router = useRouter()
	const { user } = useAuth()
	const { event } = useEventFromParams()
	const { data: player } = useMyPlayer()
	const params = useParams<{ paymentId: string }>()
	const paymentId = Number(params.paymentId) || 0
	const { amount: stripeAmount } = useCurrentPaymentAmount()
	const {
		currentStep,
		error,
		mode,
		registration,
		cancelRegistration,
		completeRegistration,
		createPaymentIntent,
		initiateStripeSession,
		loadRegistration,
		setError,
		updateStep,
	} = useRegistration()

	const stripe = useStripe()
	const elements = useElements()

	const [paymentProcessing, setPaymentProcessing] = useState(false)
	const [paymentStep, setPaymentStep] = useState("")
	const [paymentSubmitted, setPaymentSubmitted] = useState(false)
	const [showBlocker, setShowBlocker] = useState(false)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)
	const paymentOperationRef = useRef<{ cancelled: boolean }>({ cancelled: false })
	const loadedRef = useRef(false)

	// On mount: restore registration state if not already loaded
	useEffect(() => {
		if (loadedRef.current || !player?.id || !paymentId || registration) return
		loadedRef.current = true

		void loadRegistration(player.id, paymentId).then(() => {
			updateStep(PaymentStepConst)
			initiateStripeSession()
		})
	}, [player?.id, paymentId, registration, loadRegistration, updateStep, initiateStripeSession])

	const eventUrl = event ? getEventUrl(event) : ""

	// Block browser navigation during processing
	useEffect(() => {
		if (!paymentProcessing) return
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault()
		}
		window.addEventListener("beforeunload", handler)
		return () => window.removeEventListener("beforeunload", handler)
	}, [paymentProcessing])

	const handlePaymentTimeout = useCallback(() => {
		if (paymentOperationRef.current) {
			paymentOperationRef.current.cancelled = true
		}
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		setPaymentStep("Payment timed out")
		setPaymentProcessing(false)

		if (paymentSubmitted) {
			setError(
				"Payment may have been processed. Please check 'My Events' or your bank account before trying again. " +
					"Do NOT retry immediately to avoid duplicate charges.",
			)
		} else {
			if (buttonRef.current) {
				buttonRef.current.disabled = false
			}
			setError("Payment timed out before processing. You can safely try again.")
		}
	}, [paymentSubmitted, setError])

	usePaymentTimeout({
		isProcessing: paymentProcessing,
		onTimeout: handlePaymentTimeout,
		timeoutDuration: 120000,
	})

	const handleBack = () => {
		updateStep(ReviewStep)
		router.back()
	}

	const handlePaymentCanceled = useCallback(() => {
		setPaymentProcessing(false)
		setPaymentStep("")

		if (buttonRef.current) {
			buttonRef.current.disabled = false
		}

		if (eventUrl) {
			router.push(eventUrl)
		}
	}, [eventUrl, router])

	const handleForceCancel = async () => {
		try {
			setPaymentStep("Canceling payment...")

			if (paymentOperationRef.current) {
				paymentOperationRef.current.cancelled = true
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			await cancelRegistration("user", mode === "idle" ? "new" : mode)
			handlePaymentCanceled()
		} catch {
			handlePaymentCanceled()
		}
	}

	const handleExpired = useCallback(() => {
		void cancelRegistration("timeout", mode === "idle" ? "new" : mode)
		router.push(eventUrl)
	}, [cancelRegistration, eventUrl, mode, router])

	const handleSubmitPayment = async () => {
		if (!buttonRef.current) return

		const abortController = new AbortController()
		const operationTracker = { cancelled: false }
		abortControllerRef.current = abortController
		paymentOperationRef.current = operationTracker

		buttonRef.current.disabled = true

		try {
			if (operationTracker.cancelled) return

			setPaymentStep("Validating payment information...")
			const { error: submitError } = await elements!.submit()
			if (submitError) {
				setError(submitError.message ?? "Payment validation failed")
				return
			}

			if (operationTracker.cancelled) return

			setPaymentStep("Creating secure payment...")
			const intent = await createPaymentIntent()

			if (operationTracker.cancelled) return

			setPaymentProcessing(true)

			setPaymentStep("Processing payment...")
			setPaymentSubmitted(true)
			const { error: confirmError } = await stripe!.confirmPayment({
				elements: elements!,
				clientSecret: intent.client_secret,
				confirmParams: {
					payment_method_data: {
						billing_details: {
							name: `${user?.firstName} ${user?.lastName}`,
							email: user?.email,
							address: { country: "US" },
						},
					},
					return_url: `${window.location.origin}${window.location.pathname.replace("payment", "complete")}`,
				},
			})

			if (!confirmError) {
				setPaymentProcessing(false)
				setPaymentStep("Payment completed successfully!")
				completeRegistration()
				return
			}

			if (operationTracker.cancelled) return

			setError(confirmError.message ?? "Payment failed")
		} catch (err) {
			if (operationTracker.cancelled) return
			setError(err instanceof Error ? err.message : "An unknown error occurred")
		} finally {
			if (!operationTracker.cancelled) {
				if (buttonRef.current) {
					buttonRef.current.disabled = false
				}
				setPaymentStep("")
			}
			abortControllerRef.current = null
			paymentOperationRef.current = { cancelled: false }
		}
	}

	return (
		<Card>
			<CardContent className="space-y-4 pt-6">
				<h3 className="text-lg font-semibold">{currentStep.title}</h3>

				<p className="text-sm font-medium text-primary">
					Amount due: {formatCurrency(stripeAmount.total)}
				</p>

				{paymentStep && (
					<div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
						{paymentProcessing && (
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						)}
						<span>{paymentStep}</span>
						{paymentProcessing && (
							<Button
								variant="ghost"
								size="sm"
								className="ml-auto text-destructive"
								onClick={() => void handleForceCancel()}
							>
								Force Cancel
							</Button>
						)}
					</div>
				)}

				{error && (
					<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						{error}
						<button className="ml-2 underline" onClick={() => setError(null)} type="button">
							Dismiss
						</button>
					</div>
				)}

				<div>
					<PaymentElement
						options={{
							business: { name: "BHMC" },
							layout: {
								type: "accordion",
								defaultCollapsed: false,
								radios: true,
								spacedAccordionItems: true,
							},
							fields: {
								billingDetails: {
									name: "never",
									email: "never",
									address: { country: "never" },
								},
							},
							terms: { card: "auto" },
						}}
					/>
				</div>

				{registration?.expires && mode === "new" && (
					<RegistrationCountdown expires={registration.expires} onExpired={handleExpired} />
				)}

				<div className="flex justify-end gap-2">
					<Button variant="secondary" disabled={paymentProcessing} onClick={handleBack}>
						Back
					</Button>
					<Button
						variant="destructive"
						disabled={paymentProcessing}
						onClick={handlePaymentCanceled}
					>
						Cancel
					</Button>
					<Button
						ref={buttonRef}
						disabled={!stripe || !elements || paymentProcessing || paymentSubmitted}
						onClick={() => void handleSubmitPayment()}
					>
						{paymentProcessing ? "Processing..." : "Submit Payment"}
					</Button>
				</div>
			</CardContent>

			<AlertDialog open={showBlocker && paymentProcessing} onOpenChange={setShowBlocker}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Payment in Progress</AlertDialogTitle>
						<AlertDialogDescription>
							Your payment is currently being processed. Leaving now could result in an incomplete
							transaction or duplicate charges. We recommend waiting for the payment to complete.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Wait</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								void cancelRegistration("navigation", mode === "idle" ? "new" : mode)
								handlePaymentCanceled()
							}}
						>
							Cancel and Leave
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	)
}
