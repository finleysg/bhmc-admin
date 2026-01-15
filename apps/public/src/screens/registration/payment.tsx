import { useRef, useState } from "react"

import { useBlocker, useNavigate } from "react-router-dom"

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"

import { CancelButton } from "../../components/event-registration/cancel-button"
import { RegisterCountdown } from "../../components/event-registration/register-countdown"
import { ErrorDisplay } from "../../components/feedback/error-display"
import { PaymentStatusIndicator } from "../../components/payment/payment-status-indicator"
import { ReviewStep } from "../../context/registration-reducer"
import { useAuth } from "../../hooks/use-auth"
import { useEventRegistration } from "../../hooks/use-event-registration"
import { useEventRegistrationGuard } from "../../hooks/use-event-registration-guard"
import { usePaymentTimeout } from "../../hooks/use-payment-timeout"
import * as config from "../../utils/app-config"
import { useCurrentPaymentAmount } from "./payment-flow"

export function PaymentScreen() {
	const { user } = useAuth()
	const [paymentProcessing, setPaymentProcessing] = useState(false)
	const [paymentCanceled, setPaymentCanceled] = useState(false)
	const [paymentStep, setPaymentStep] = useState<string>("")
	const [processingStartTime, setProcessingStartTime] = useState<number | null>(null)
	const [paymentSubmitted, setPaymentSubmitted] = useState(false)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const abortControllerRef = useRef<AbortController | null>(null)
	const paymentOperationRef = useRef<{ cancelled: boolean }>({ cancelled: false })
	const stripeCallInProgressRef = useRef(false)
	const { amount: stripeAmount } = useCurrentPaymentAmount()
	const {
		currentStep,
		error,
		mode,
		registration,
		cancelRegistration,
		completeRegistration,
		createPaymentIntent,
		setError,
		updateStep,
	} = useEventRegistration()

	const stripe = useStripe()
	const elements = useElements()
	const navigate = useNavigate()

	useEventRegistrationGuard(registration)

	// Handle payment timeout for stuck payments
	// This provides automatic recovery from stuck payment states
	const handlePaymentTimeout = () => {
		console.warn("Payment timed out - forcing cleanup")

		// Mark any ongoing payment operation as cancelled
		if (paymentOperationRef.current) {
			paymentOperationRef.current.cancelled = true
		}

		// Abort any ongoing network requests
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}

		setPaymentStep("Payment timed out")
		setPaymentProcessing(false)
		setProcessingStartTime(null)

		// If Stripe was called, don't allow retry - payment may have processed
		if (paymentSubmitted) {
			setError(
				new Error(
					"Payment may have been processed. Please check 'My Events' or your bank account before trying again. " +
						"Do NOT retry immediately to avoid duplicate charges.",
				),
			)
		} else {
			// Safe to retry - Stripe was never called
			if (buttonRef.current) {
				buttonRef.current.disabled = false
			}
			setError(new Error("Payment timed out before processing. You can safely try again."))
		}
	}

	// Set up automatic timeout for stuck payments after 2 minutes
	usePaymentTimeout({
		isProcessing: paymentProcessing,
		onTimeout: handlePaymentTimeout,
		timeoutDuration: 120000, // 2 minutes
	})

	// This flag means the user has started the payment process, but
	// something went wrong and they need to cancel before leaving.
	const blocker = useBlocker(paymentProcessing)
	if (blocker.state === "blocked" && paymentCanceled) {
		blocker.proceed()
	}

	const handleBack = () => {
		updateStep(ReviewStep)
		navigate("../../review", { replace: true })
	}

	const handleCancelPayment = async () => {
		if (blocker.state === "blocked") {
			await cancelRegistration("navigation", mode)
			blocker.proceed()
		}
	}

	const handlePaymentCanceled = () => {
		setPaymentProcessing(false)
		setPaymentCanceled(true) // Overrides the blocker
		setPaymentStep("")
		setProcessingStartTime(null)

		// Re-enable the button
		if (buttonRef.current) {
			buttonRef.current.disabled = false
		}

		navigate("../../", { replace: true }) // event detail
	}

	const handleForceCancel = async () => {
		try {
			setPaymentStep("Canceling payment...")

			// Mark the current payment operation as cancelled
			if (paymentOperationRef.current) {
				paymentOperationRef.current.cancelled = true
			}

			// Abort any ongoing network requests
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			// Cancel the registration to clean up any server-side state
			await cancelRegistration("user", mode)
			handlePaymentCanceled()
		} catch (err) {
			console.error("Error during force cancel:", err)
			// Even if cancellation fails, we should allow the user to proceed
			handlePaymentCanceled()
		}
	}

	const handleError = (error: unknown) => {
		console.error(error)
		if (error instanceof Error) {
			setError(error)
		} else if (Object.prototype.hasOwnProperty.call(error, "message")) {
			setError(new Error((error as { message: string }).message))
		} else {
			setError(new Error("An unknown error occurred."))
		}
	}

	const handleSubmitPayment = async () => {
		if (!buttonRef.current) {
			throw new Error("Inconceivable! Button ref not found.")
		}

		// Create a new abort controller and operation tracker for this payment attempt
		const abortController = new AbortController()
		const operationTracker = { cancelled: false }
		abortControllerRef.current = abortController
		paymentOperationRef.current = operationTracker

		buttonRef.current.disabled = true
		setProcessingStartTime(Date.now())

		try {
			// Check if operation was cancelled before starting
			if (operationTracker.cancelled) {
				console.log("Payment operation was cancelled before starting")
				return
			}

			// 1. Validate the payment element.
			setPaymentStep("Validating payment information...")
			const { error: submitError } = await elements!.submit()
			if (submitError) {
				handleError(submitError)
				return
			}

			// Check for cancellation after validation
			if (operationTracker.cancelled) {
				console.log("Payment operation was cancelled after validation")
				return
			}

			// 2. Create the payment intent.
			setPaymentStep("Creating secure payment...")
			const intent = await createPaymentIntent()

			// Check for cancellation after intent creation
			if (operationTracker.cancelled) {
				console.log("Payment operation was cancelled after creating payment intent")
				return
			}

			setPaymentProcessing(true)

			// 3. Confirm the payment.
			// Note: Stripe's confirmPayment cannot be cancelled directly
			setPaymentStep("Processing payment...")
			setPaymentSubmitted(true)
			stripeCallInProgressRef.current = true
			const confirmPaymentPromise = stripe!.confirmPayment({
				elements: elements!,
				clientSecret: intent.client_secret!,
				confirmParams: {
					payment_method_data: {
						billing_details: {
							name: user.name,
							email: user.email,
							address: {
								country: "US",
							},
						},
					},
					return_url: `${window.location.origin}${window.location.pathname.replace("payment", "complete")}`,
				},
			})

			const { error: confirmError } = await confirmPaymentPromise
			stripeCallInProgressRef.current = false

			// CRITICAL: If Stripe succeeded, ALWAYS complete registration
			// Money was taken - we cannot ignore this even if cancelled
			if (!confirmError) {
				console.log("Stripe payment succeeded - completing registration")
				setPaymentProcessing(false)
				setPaymentStep("Payment completed successfully!")
				completeRegistration()
				return
			}

			// Only ignore errors if operation was cancelled
			if (operationTracker.cancelled) {
				console.log("Payment operation was cancelled - ignoring Stripe error")
				return
			}

			handleError(confirmError)
		} catch (err) {
			// Check if the error is due to cancellation
			if (operationTracker.cancelled) {
				console.log("Payment operation was cancelled - ignoring error")
				return
			}
			handleError(err)
		} finally {
			// Only clean up UI state if operation wasn't cancelled
			// (cancelled operations handle their own cleanup)
			if (!operationTracker.cancelled) {
				if (buttonRef.current) {
					buttonRef.current.disabled = false
				}
				setProcessingStartTime(null)
				setPaymentStep("")
			}

			// Always clear the refs
			abortControllerRef.current = null
			paymentOperationRef.current = { cancelled: false }
		}
	}

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2">{currentStep.title}</h4>
						<p className="text-info fst-italic mb-4">{registration?.selectedStart}</p>
						<h6 className="text-primary">
							Amount due: {config.currencyFormatter.format(stripeAmount.total)}
						</h6>

						<PaymentStatusIndicator
							isProcessing={paymentProcessing}
							step={paymentStep}
							processingStartTime={processingStartTime}
							onForceCancel={handleForceCancel}
							showForceCancel={paymentProcessing}
						/>

						{error && <ErrorDisplay error={error?.message} onClose={() => setError(null)} />}
						{blocker.state === "blocked" && (
							<div className="alert alert-danger mb-4">
								<h6 className="alert-heading">Payment in Progress</h6>
								<p className="mb-2">
									Your payment is currently being processed. Leaving this page now could result in
									an incomplete transaction or duplicate charges.
								</p>
								<p className="mb-3">
									<strong>We recommend waiting for the payment to complete.</strong>
								</p>
								<button className="btn btn-danger" onClick={handleCancelPayment}>
									I understand the risks - Cancel and Proceed
								</button>
							</div>
						)}
						<div className="mb-4">
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
									terms: {
										card: "auto",
									},
								}}
							/>
						</div>
						<hr />
						<div style={{ textAlign: "right" }}>
							<RegisterCountdown doCountdown={mode === "new"} />
							<button
								className="btn btn-secondary"
								disabled={paymentProcessing}
								onClick={handleBack}
							>
								Back
							</button>
							<CancelButton mode={mode} onCanceled={handlePaymentCanceled} />
							<button
								disabled={!stripe || !elements || paymentProcessing || paymentSubmitted}
								className="btn btn-primary ms-2"
								ref={buttonRef}
								onClick={handleSubmitPayment}
								title={
									!stripe || !elements
										? "Loading payment system..."
										: paymentProcessing
											? "Processing payment - please wait"
											: paymentSubmitted
												? "Payment already submitted"
												: "Submit your payment"
								}
							>
								{paymentProcessing ? "Processing..." : "Submit Payment"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
