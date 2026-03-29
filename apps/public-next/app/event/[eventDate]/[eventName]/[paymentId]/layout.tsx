"use client"

import { createContext, useContext } from "react"
import { useParams } from "next/navigation"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { useAuth } from "@/lib/auth-context"
import { useCustomerSession } from "@/lib/hooks/use-customer-session"
import { type PaymentAmount, useStripeAmount } from "@/lib/hooks/use-stripe-amount"

type PaymentAmountContextType = { amount: PaymentAmount }

const PaymentAmountContext = createContext<PaymentAmountContextType | null>(null)

export function useCurrentPaymentAmount() {
	const context = useContext(PaymentAmountContext)
	if (!context) {
		throw new Error("useCurrentPaymentAmount must be used within a PaymentLayout")
	}
	return context
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
	const { paymentId } = useParams<{ paymentId: string }>()
	const { isAuthenticated } = useAuth()
	const { data: customerSessionSecret, isPending: sessionPending } =
		useCustomerSession(isAuthenticated)
	const { data: stripeAmount, isPending: amountPending } = useStripeAmount(Number(paymentId))

	if (amountPending || !stripeAmount || (isAuthenticated && sessionPending)) {
		return null
	}

	return (
		<Elements
			stripe={stripePromise}
			options={{
				mode: "payment",
				currency: "usd",
				amount: stripeAmount.amountCents,
				customerSessionClientSecret: customerSessionSecret,
			}}
		>
			<PaymentAmountContext.Provider value={{ amount: stripeAmount.amountDue }}>
				{children}
			</PaymentAmountContext.Provider>
		</Elements>
	)
}
