"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRegistration } from "@/lib/registration/registration-context"
import { ReviewStep } from "@/lib/registration/registration-reducer"
import { getEventUrl } from "@/lib/event-utils"
import { formatCurrency } from "@/lib/registration/payment-utils"
import { useCurrentPaymentAmount } from "../layout"

export default function PaymentPage() {
	const router = useRouter()
	const stripe = useStripe()
	const elements = useElements()
	const { user } = useAuth()
	const { amount } = useCurrentPaymentAmount()
	const { currentStep, clubEvent, setError, createPaymentIntent, updateStep } = useRegistration()

	const [paymentProcessing, setPaymentProcessing] = useState(false)
	const [paymentSubmitted, setPaymentSubmitted] = useState(false)

	useEffect(() => {
		if (!paymentProcessing) return

		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault()
		}
		window.addEventListener("beforeunload", handler)
		return () => window.removeEventListener("beforeunload", handler)
	}, [paymentProcessing])

	const handleBack = useCallback(() => {
		updateStep(ReviewStep)
		router.replace(`${getEventUrl(clubEvent!)}/review`)
	}, [updateStep, router, clubEvent])

	const handleSubmit = useCallback(async () => {
		if (!stripe || !elements) return

		setPaymentProcessing(true)

		// 1. Validate the payment element
		const { error: submitError } = await elements.submit()
		if (submitError) {
			setError(submitError.message ?? "Validation failed")
			setPaymentProcessing(false)
			return
		}

		// 2. Create the payment intent
		const intent = await createPaymentIntent()

		// 3. Confirm the payment
		setPaymentSubmitted(true)
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
				return_url: `${window.location.origin}${window.location.pathname.replace("/payment", "/complete")}`,
			},
		})
	}, [stripe, elements, createPaymentIntent, setError, user])

	return (
		<Card className="md:max-w-[60%]">
			<CardHeader>
				<CardTitle className="text-lg">{currentStep.title}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<p className="text-sm font-medium text-primary">
					Amount due: {formatCurrency(amount.total)}
				</p>
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
			<CardFooter className="flex flex-col gap-4">
				<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button variant="outline" onClick={handleBack} disabled={paymentProcessing}>
						Back
					</Button>
					<Button
						onClick={() => void handleSubmit()}
						disabled={!stripe || !elements || paymentProcessing || paymentSubmitted}
					>
						{paymentProcessing ? "Processing..." : "Submit Payment"}
					</Button>
				</div>
			</CardFooter>
		</Card>
	)
}
