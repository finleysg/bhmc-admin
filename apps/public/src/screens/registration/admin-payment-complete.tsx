import { useEffect, useState } from "react"

import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"

import { useStripe } from "@stripe/react-stripe-js"
import { PaymentIntent } from "@stripe/stripe-js"

import { ErrorDisplay } from "../../components/feedback/error-display"
import { RandomGif } from "../../components/giphy/random-gif"
import { useAdminPaymentData } from "../../hooks/use-admin-payment-data"
import { useAuth } from "../../hooks/use-auth"
import * as config from "../../utils/app-config"
import { useAdminPaymentAmount } from "./admin-payment-flow"

export function AdminPaymentCompleteScreen() {
	const { registrationId, paymentId } = useParams()
	const [params] = useSearchParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const { amount: stripeAmount } = useAdminPaymentAmount()
	const [error, setError] = useState<Error | null>(null)
	const [intent, setIntent] = useState<PaymentIntent | null>(null)
	const stripe = useStripe()

	const { clubEvent } = useAdminPaymentData(Number(registrationId), Number(paymentId))

	useEffect(() => {
		const clientSecret = params.get("payment_intent_client_secret")
		if (!clientSecret) {
			navigate(`/registration/${registrationId}/payment/${paymentId}`, { replace: true })
			return
		}

		if (!stripe) return

		stripe
			.retrievePaymentIntent(clientSecret)
			.then(({ error, paymentIntent }) => {
				setIntent(paymentIntent ?? null)
				if (error) {
					setError(new Error(error.message))
				}
			})
			.catch((err) => {
				const message = err instanceof Error ? err.message : "Failed to retrieve payment intent"
				setError(new Error(message))
			})
	}, [stripe, params, navigate, registrationId, paymentId])

	return (
		<div className="row">
			<div className="col-12 col-md-6">
				<div className="card border border-primary mb-4">
					<div className="card-body">
						<h4 className="card-header mb-2">{error ? "Payment Failed" : "Payment Complete"}</h4>
						<div className="row mb-4">
							<div className="col-12">
								{error && (
									<>
										<h5 className="text-danger">An error occurred processing your payment</h5>
										<ErrorDisplay
											error={error?.message}
											delay={10000}
											onClose={() => setError(null)}
										/>
									</>
								)}
								{intent?.status === "succeeded" && (
									<>
										<h5 className="text-primary-emphasis">
											Your payment for{" "}
											{config.currencyFormatter.format(stripeAmount.amountDue.total)} has been
											processed.
										</h5>
										<p>
											A confirmation email will be sent to {user?.email} and anyone you signed up. A
											payment receipt will also be sent from Stripe, our payment provider.
										</p>
										<RandomGif enabled={true} />
									</>
								)}
								{intent?.status !== "succeeded" && !error && (
									<p>Payment status is {intent?.status}.</p>
								)}
							</div>
						</div>
						<hr />
						<div className="row">
							<div className="col-12" style={{ textAlign: "right" }}>
								{clubEvent && (
									<Link
										className="btn btn-info btn-sm"
										to={clubEvent.eventUrl + "/registrations"}
										replace={true}
									>
										See All Players
									</Link>
								)}
								<Link to="/home" className="btn btn-sm btn-primary ms-2">
									Home
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
