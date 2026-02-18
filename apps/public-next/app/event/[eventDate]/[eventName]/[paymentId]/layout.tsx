"use client"

import { Component, createContext, useContext, type PropsWithChildren, type ReactNode } from "react"
import { useParams } from "next/navigation"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useStripeAmount } from "@/lib/hooks/use-stripe-amount"
import { useRegistration } from "@/lib/registration/registration-context"
import type { PaymentAmount } from "@/lib/registration/types"
import { RegistrationPageWrapper } from "../components/registration-page-wrapper"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

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

// --- Stripe Error Boundary ---

interface StripeErrorBoundaryProps {
	children: ReactNode
}

interface StripeErrorBoundaryState {
	hasError: boolean
	error: Error | null
}

class StripeErrorBoundary extends Component<StripeErrorBoundaryProps, StripeErrorBoundaryState> {
	constructor(props: StripeErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): StripeErrorBoundaryState {
		return { hasError: true, error }
	}

	render() {
		if (this.state.hasError) {
			return (
				<Card>
					<CardContent className="space-y-4 py-8 text-center">
						<p className="font-medium text-destructive">
							Something went wrong loading the payment form
						</p>
						<p className="text-sm text-muted-foreground">
							{this.state.error?.message ?? "An unexpected error occurred"}
						</p>
						<Button
							variant="outline"
							onClick={() => this.setState({ hasError: false, error: null })}
						>
							Try Again
						</Button>
					</CardContent>
				</Card>
			)
		}
		return this.props.children
	}
}

function PaymentLayoutInner({ children }: PropsWithChildren) {
	const { stripeClientSession } = useRegistration()
	const params = useParams<{ paymentId: string }>()
	const paymentId = Number(params.paymentId) || 0
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
		<StripeErrorBoundary>
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
		</StripeErrorBoundary>
	)
}
