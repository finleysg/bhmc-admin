"use client"

import { createContext, useContext, useState, type PropsWithChildren } from "react"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { Card, CardContent } from "@/components/ui/card"
import { useStripeAmount } from "@/lib/hooks/use-stripe-amount"
import { useRegistration } from "@/lib/registration/registration-context"
import type { PaymentAmount } from "@/lib/registration/types"
import { RegistrationPageWrapper } from "../components/registration-page-wrapper"

interface StripeAmountContextType {
	amount: PaymentAmount
}

const StripeAmountContext = createContext<StripeAmountContextType | null>(null)

export function useCurrentPaymentAmount() {
	const context = useContext(StripeAmountContext)
	if (!context) {
		throw new Error("useCurrentPaymentAmount must be used within the payment layout")
	}
	return context
}

export default function PaymentLayout({ children }: PropsWithChildren) {
	return (
		<RegistrationPageWrapper>
			{() => <PaymentLayoutInner>{children}</PaymentLayoutInner>}
		</RegistrationPageWrapper>
	)
}

function PaymentLayoutInner({ children }: PropsWithChildren) {
	const [stripePromise] = useState(() => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!))
	const { stripeClientSession, payment } = useRegistration()
	const paymentId = payment?.id ?? 0
	const { data: stripeAmount, status } = useStripeAmount(paymentId)

	if (status === "pending" || !stripeAmount) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">Loading payment information...</p>
				</CardContent>
			</Card>
		)
	}

	if (status === "error") {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-destructive">Error loading payment information</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Elements
			stripe={stripePromise}
			options={{
				mode: "payment",
				currency: "usd",
				amount: stripeAmount.amountCents,
				customerSessionClientSecret: stripeClientSession,
			}}
		>
			<StripeAmountContext.Provider value={{ amount: stripeAmount.amountDue }}>
				{children}
			</StripeAmountContext.Provider>
		</Elements>
	)
}
