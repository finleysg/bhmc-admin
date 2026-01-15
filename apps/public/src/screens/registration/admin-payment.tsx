import { useRef, useState } from "react"

import { Link, useParams } from "react-router-dom"

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { PaymentIntent } from "@stripe/stripe-js"

import { ErrorDisplay } from "../../components/feedback/error-display"
import { useAdminPaymentData } from "../../hooks/use-admin-payment-data"
import { useAuth } from "../../hooks/use-auth"
import { httpClient } from "../../utils/api-client"
import { serverUrl } from "../../utils/api-utils"
import * as config from "../../utils/app-config"
import { useAdminPaymentAmount } from "./admin-payment-flow"

export function AdminPaymentScreen() {
	const { registrationId, paymentId } = useParams()
	const { user } = useAuth()
	const [paymentProcessing, setPaymentProcessing] = useState(false)
	const [paymentStep, setPaymentStep] = useState<string>("")
	const [error, setError] = useState<Error | null>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)
	const { amount: stripeAmount } = useAdminPaymentAmount()

	const {
		registration,
		clubEvent,
		isLoading,
		error: fetchError,
		validationError,
	} = useAdminPaymentData(Number(registrationId), Number(paymentId))

	const stripe = useStripe()
	const elements = useElements()

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

	const createPaymentIntent = async (): Promise<PaymentIntent> => {
		return httpClient(serverUrl(`payments/${paymentId}/payment-intent`), {
			body: JSON.stringify({
				eventId: clubEvent?.id,
				registrationId: registration?.id,
			}),
		}) as Promise<PaymentIntent>
	}

	const handleSubmitPayment = async () => {
		try {
			if (!buttonRef.current) {
				throw new Error("Button ref not found.")
			}

			buttonRef.current.disabled = true

			setPaymentStep("Validating payment information...")
			const { error: submitError } = await elements!.submit()
			if (submitError) {
				handleError(submitError)
				return
			}

			setPaymentStep("Creating secure payment...")
			const intent = await createPaymentIntent()

			setPaymentProcessing(true)

			setPaymentStep("Processing payment...")
			const { error: confirmError } = await stripe!.confirmPayment({
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
					return_url: `${window.location.origin}${window.location.pathname}/complete`,
				},
			})

			if (confirmError) {
				handleError(confirmError)
				return
			}

			setPaymentProcessing(false)
			setPaymentStep("Payment completed successfully!")
		} catch (err) {
			handleError(err)
		} finally {
			if (buttonRef.current) {
				buttonRef.current.disabled = false
			}
			setPaymentStep("")
		}
	}

	if (isLoading) {
		return (
			<div className="row">
				<div className="col-12 col-md-6">
					<div className="card mb-4">
						<div className="card-body">
							<p>Loading payment details...</p>
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (fetchError) {
		return (
			<div className="row">
				<div className="col-12 col-md-6">
					<div className="card mb-4">
						<div className="card-body">
							<h4 className="card-header mb-2">Error</h4>
							<p className="text-danger">{fetchError.message}</p>
							<Link to="/home" className="btn btn-primary">
								Return Home
							</Link>
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (validationError) {
		return (
			<div className="row">
				<div className="col-12 col-md-6">
					<div className="card mb-4">
						<div className="card-body">
							<h4 className="card-header mb-2">Unable to Process Payment</h4>
							<p className="text-danger">{validationError}</p>
							<Link to="/home" className="btn btn-primary">
								Return Home
							</Link>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2">Complete Your Payment</h4>
						<p className="text-muted mb-2">
							{clubEvent?.slugDate} {clubEvent?.name}
						</p>
						<h6 className="text-primary mb-4">
							Amount due: {config.currencyFormatter.format(stripeAmount.amountDue.total)}
						</h6>

						{paymentStep && (
							<div className="alert alert-info mb-4">
								<span>{paymentStep}</span>
							</div>
						)}

						{error && <ErrorDisplay error={error?.message} onClose={() => setError(null)} />}

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
								}}
							/>
						</div>
						<hr />
						<div style={{ textAlign: "right" }}>
							<button
								disabled={!stripe || !elements || paymentProcessing}
								className="btn btn-primary"
								ref={buttonRef}
								onClick={handleSubmitPayment}
								title={
									!stripe || !elements
										? "Loading payment system..."
										: paymentProcessing
											? "Processing payment - please wait"
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
