"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { useStripe } from "@stripe/react-stripe-js"
import type { PaymentIntent } from "@stripe/stripe-js"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getEventUrl } from "@/lib/event-utils"
import { useAuth } from "@/lib/auth-context"
import { useEventFromParams } from "@/lib/hooks/use-event-from-params"
import { formatCurrency } from "@/lib/registration/payment-utils"
import { useCurrentPaymentAmount } from "../layout"

export default function CompletePage() {
	const searchParams = useSearchParams()
	const { user } = useAuth()
	const { event } = useEventFromParams()
	const { amount: stripeAmount } = useCurrentPaymentAmount()
	const [error, setError] = useState<string | null>(null)
	const [intent, setIntent] = useState<PaymentIntent | null>(null)
	const stripe = useStripe()

	const eventUrl = event ? getEventUrl(event) : ""

	useEffect(() => {
		if (!stripe) return

		const clientSecret = searchParams.get("payment_intent_client_secret")
		if (!clientSecret) {
			setError("Missing payment intent client secret")
			return
		}

		stripe
			.retrievePaymentIntent(clientSecret)
			.then(({ error: stripeError, paymentIntent }) => {
				setIntent(paymentIntent ?? null)
				if (stripeError) {
					setError(stripeError.message ?? "Failed to retrieve payment status")
				}
			})
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : "Failed to retrieve payment intent"
				setError(message)
			})
	}, [stripe, searchParams])

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
		<Card>
			<CardContent className="space-y-4 pt-6">
				<h3 className="text-lg font-semibold">{title}</h3>

				{error && (
					<div className="space-y-2">
						<p className="font-medium text-destructive">
							An error occurred processing your payment
						</p>
						<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
					</div>
				)}

				{intent?.status === "succeeded" && (
					<div className="space-y-2">
						<p className="font-medium text-primary">
							Your payment for {formatCurrency(stripeAmount.total)} has been processed.
						</p>
						<p className="text-sm text-muted-foreground">
							A confirmation email will be sent to {user?.email} and anyone you signed up unless
							this is just an update (skins, for example). A payment receipt will also be sent from
							Stripe, our payment provider.
						</p>
					</div>
				)}

				{intent?.status === "processing" && (
					<div className="space-y-2">
						<p className="font-medium text-amber-600 dark:text-amber-400">
							Your payment is being processed
						</p>
						<p className="text-sm text-muted-foreground">
							Your payment is being processed by your bank. This usually takes a few moments. You
							will receive a confirmation email once the payment is complete.
						</p>
					</div>
				)}

				{intent?.status === "requires_action" && (
					<div className="space-y-2">
						<p className="font-medium text-amber-600 dark:text-amber-400">
							Additional verification required
						</p>
						<p className="text-sm text-muted-foreground">
							Your bank requires additional verification. Please complete the verification process
							to finalize your payment.
						</p>
					</div>
				)}

				{intent?.status === "requires_payment_method" && (
					<div className="space-y-2">
						<p className="font-medium text-destructive">Payment failed</p>
						<p className="text-sm text-muted-foreground">
							Your payment method was declined. Please return to the payment page and try a
							different payment method.
						</p>
						<Button variant="outline" asChild>
							<Link href={`${eventUrl}/${searchParams.get("payment_id") ?? ""}/payment`}>
								Try Again
							</Link>
						</Button>
					</div>
				)}

				{!intent && !error && (
					<div className="flex justify-center py-4">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</div>
				)}

				<div className="flex justify-end gap-2 border-t pt-4">
					{eventUrl && (
						<Button variant="outline" asChild>
							<Link href={`${eventUrl}/registrations`}>See All Players</Link>
						</Button>
					)}
					<Button asChild>
						<Link href="/">Home</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
