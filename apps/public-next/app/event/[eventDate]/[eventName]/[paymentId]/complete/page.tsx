"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { useStripe } from "@stripe/react-stripe-js"
import type { PaymentIntent } from "@stripe/stripe-js"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRegistration } from "@/lib/registration/registration-context"
import { formatCurrency } from "@/lib/registration/payment-utils"
import { useCurrentPaymentAmount } from "../layout"

export default function CompletePage() {
	const searchParams = useSearchParams()
	const stripe = useStripe()
	const { user } = useAuth()
	const { clubEvent, completeRegistration } = useRegistration()
	const { amount } = useCurrentPaymentAmount()

	const [intent, setIntent] = useState<PaymentIntent | null>(null)
	const [error, setError] = useState<string | null>(null)

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
		<Card className="md:max-w-[60%]">
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
							A confirmation email will be sent to {user?.email} and anyone you signed
							up unless this is just an update. A payment receipt will also be sent from
							Stripe.
						</p>
					</>
				)}
				{error && (
					<p className="text-sm text-destructive">{error}</p>
				)}
			</CardContent>
			<CardFooter />
		</Card>
	)
}
