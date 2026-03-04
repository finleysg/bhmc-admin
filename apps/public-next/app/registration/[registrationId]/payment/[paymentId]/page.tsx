"use client"

import { useCallback, useState } from "react"

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { formatCurrency } from "@/lib/registration/payment-utils"
import { useAdminPayment } from "./layout"

export default function AdminPaymentPage() {
	const stripe = useStripe()
	const elements = useElements()
	const { user } = useAuth()
	const { amount, data } = useAdminPayment()

	const [paymentProcessing, setPaymentProcessing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = useCallback(async () => {
		if (!stripe || !elements) return

		setPaymentProcessing(true)
		setError(null)

		const { error: submitError } = await elements.submit()
		if (submitError) {
			setError(submitError.message ?? "Validation failed")
			setPaymentProcessing(false)
			return
		}

		const intentResponse = await fetch(`/api/payments/${data.paymentId}/payment-intent`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				eventId: data.eventId,
				registrationId: data.registrationId,
			}),
		})

		if (!intentResponse.ok) {
			setError("Failed to create payment intent")
			setPaymentProcessing(false)
			return
		}

		const intent = (await intentResponse.json()) as { client_secret: string }

		await stripe.confirmPayment({
			elements,
			clientSecret: intent.client_secret,
			confirmParams: {
				payment_method_data: {
					billing_details: {
						name: user ? `${user.firstName} ${user.lastName}` : "",
						email: user?.email ?? "",
						address: { country: "US" },
					},
				},
				return_url: `${window.location.origin}${window.location.pathname}/complete`,
			},
		})
	}, [stripe, elements, user, data])

	return (
		<Card className="md:max-w-[560px]">
			<CardHeader>
				<CardTitle className="text-lg">Complete Your Payment</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					{data.eventDate} {data.eventName}
				</p>
				<p className="text-sm font-medium text-primary">
					Amount due: {formatCurrency(amount.total)}
				</p>
				{error && <p className="text-sm text-destructive">{error}</p>}
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
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button
					onClick={() => void handleSubmit()}
					disabled={!stripe || !elements || paymentProcessing}
				>
					{paymentProcessing ? "Processing..." : "Submit Payment"}
				</Button>
			</CardFooter>
		</Card>
	)
}
