"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { loadStripe } from "@stripe/stripe-js"
import type { PaymentIntent } from "@stripe/stripe-js"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/registration/payment-utils"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export default function AdminPaymentCompletePage() {
	const searchParams = useSearchParams()

	const [intent, setIntent] = useState<PaymentIntent | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const clientSecret = searchParams.get("payment_intent_client_secret")
		if (!clientSecret) {
			setError("Missing payment intent client secret")
			return
		}

		stripePromise
			.then((stripe) => {
				if (!stripe) {
					setError("Failed to load Stripe")
					return
				}
				return stripe.retrievePaymentIntent(clientSecret)
			})
			.then((result) => {
				if (!result) return
				if (result.error) {
					setError(result.error.message ?? "Failed to retrieve payment status")
					return
				}
				setIntent(result.paymentIntent ?? null)
			})
			.catch(() => {
				setError("Failed to retrieve payment status")
			})
	}, [searchParams])

	const title = error
		? "Payment Failed"
		: intent?.status === "succeeded"
			? "Payment Complete"
			: intent?.status === "processing"
				? "Payment Processing"
				: intent?.status === "requires_payment_method"
					? "Payment Failed"
					: "Payment Status"

	const amount = intent?.amount ? intent.amount / 100 : null

	return (
		<div className="max-w-2xl">
			<Card className="md:max-w-[560px]">
				<CardHeader>
					<CardTitle className="text-lg">{title}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{intent?.status === "succeeded" && (
						<>
							<p className="text-sm font-medium text-primary">
								Your payment{amount ? ` for ${formatCurrency(amount)}` : ""} has been
								processed.
							</p>
							<p className="text-sm text-muted-foreground">
								A confirmation email will be sent shortly. A payment receipt will also be
								sent from Stripe.
							</p>
						</>
					)}
					{intent?.status === "processing" && (
						<>
							<p className="text-sm font-medium text-warning">
								Your payment is being processed
							</p>
							<p className="text-sm text-muted-foreground">
								Your payment is being processed by your bank. You will receive a
								confirmation email once the payment is complete.
							</p>
						</>
					)}
					{intent?.status === "requires_payment_method" && (
						<>
							<p className="text-sm font-medium text-destructive">Payment failed</p>
							<p className="text-sm text-muted-foreground">
								Your payment method was declined. Please return to the payment page and
								try a different payment method.
							</p>
							<Link href="../" className="text-sm font-medium text-primary underline">
								Try Again
							</Link>
						</>
					)}
					{error && <p className="text-sm text-destructive">{error}</p>}
				</CardContent>
				<CardFooter>
					<Link href="/" className="text-sm font-medium text-primary underline">
						Home
					</Link>
				</CardFooter>
			</Card>
		</div>
	)
}
