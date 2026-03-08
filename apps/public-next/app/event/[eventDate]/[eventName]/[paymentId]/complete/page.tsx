"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { useStripe } from "@stripe/react-stripe-js"
import type { PaymentIntent } from "@stripe/stripe-js"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RandomGif } from "@/components/random-gif"
import { useAuth } from "@/lib/auth-context"
import { useRegistration } from "@/lib/registration/registration-context"
import { formatCurrency } from "@/lib/registration/payment-utils"
import { getEventUrl } from "@/lib/event-utils"
import { useCurrentPaymentAmount } from "../layout"

export default function CompletePage() {
	const searchParams = useSearchParams()
	const stripe = useStripe()
	const { user } = useAuth()
	const { clubEvent } = useRegistration()
	const { amount } = useCurrentPaymentAmount()

	const [intent, setIntent] = useState<PaymentIntent | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [revalidated, setRevalidated] = useState(false)

	useEffect(() => {
		if (!stripe) return

		const clientSecret = searchParams.get("payment_intent_client_secret")
		if (!clientSecret) {
			setError("Missing payment intent client secret")
			return
		}

		stripe
			.retrievePaymentIntent(clientSecret)
			.then(({ error, paymentIntent }) => {
				if (error) {
					setError(error.message ?? "Failed to retrieve payment status")
					return
				}
				setIntent(paymentIntent ?? null)
			})
			.catch(() => {
				setError("Failed to retrieve payment status")
			})
	}, [stripe, searchParams])

	useEffect(() => {
		if (intent?.status === "succeeded" && clubEvent?.id) {
			const tag = `event-registrations-${clubEvent.id}`
			// Brief delay to allow the Stripe webhook to update slot statuses
			const timer = setTimeout(() => {
				fetch("/api/revalidate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ tag }),
				})
					.then(() => setRevalidated(true))
					.catch(() => setRevalidated(true))
			}, 1500)
			return () => clearTimeout(timer)
		}
	}, [intent?.status, clubEvent?.id])

	const title = error
		? "Payment Failed"
		: intent?.status === "succeeded"
			? "Payment Complete"
			: intent?.status === "processing"
				? "Payment Processing"
				: intent?.status === "requires_action"
					? "Action Required"
					: intent?.status === "requires_payment_method"
						? "Payment Failed"
						: "Payment Status"

	return (
		<Card className="md:max-w-[560px]">
			<CardHeader>
				<CardTitle className="text-lg">{title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{intent?.status === "succeeded" && (
					<>
						<p className="text-sm font-medium text-primary">
							Your payment for {formatCurrency(amount.total)} has been processed.
						</p>
						<p className="text-sm text-muted-foreground">
							A confirmation email will be sent to {user?.email} and anyone you signed up unless
							this is just an update. A payment receipt will also be sent from Stripe.
						</p>
						<RandomGif />
					</>
				)}
				{intent?.status === "processing" && (
					<>
						<p className="text-sm font-medium text-warning">Your payment is being processed</p>
						<p className="text-sm text-muted-foreground">
							Your payment is being processed by your bank. This usually takes a few moments. You
							will receive a confirmation email once the payment is complete.
						</p>
					</>
				)}
				{intent?.status === "requires_action" && (
					<>
						<p className="text-sm font-medium text-warning">Additional verification required</p>
						<p className="text-sm text-muted-foreground">
							Your bank requires additional verification. Please complete the verification process
							to finalize your payment.
						</p>
					</>
				)}
				{intent?.status === "requires_payment_method" && (
					<>
						<p className="text-sm font-medium text-destructive">Payment failed</p>
						<p className="text-sm text-muted-foreground">
							Your payment method was declined. Please return to the payment page and try a
							different payment method.
						</p>
						<Link href="../payment" className="text-sm font-medium text-primary underline">
							Try Again
						</Link>
					</>
				)}
				{error && <p className="text-sm text-destructive">{error}</p>}
			</CardContent>
			{(revalidated || intent?.status !== "succeeded") && (
				<CardFooter className="flex gap-4">
					<Link
						href={`${getEventUrl(clubEvent!)}/registrations`}
						className="text-sm font-medium text-primary underline"
					>
						See All Players
					</Link>
					<Link href="/home" className="text-sm font-medium text-primary underline">
						Home
					</Link>
				</CardFooter>
			)}
		</Card>
	)
}
