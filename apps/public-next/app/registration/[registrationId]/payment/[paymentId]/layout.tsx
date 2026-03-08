"use client"

import { createContext, useContext } from "react"
import { useParams, usePathname } from "next/navigation"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { useAuth } from "@/lib/auth-context"
import { useAdminPaymentData, type AdminPaymentData } from "@/lib/hooks/use-admin-payment-data"
import { useCustomerSession } from "@/lib/hooks/use-customer-session"
import { type PaymentAmount, useStripeAmount } from "@/lib/hooks/use-stripe-amount"

export interface AdminPaymentContextType {
	amount: PaymentAmount
	data: AdminPaymentData
}

const AdminPaymentContext = createContext<AdminPaymentContextType | null>(null)

export function useAdminPayment() {
	const context = useContext(AdminPaymentContext)
	if (!context) {
		throw new Error("useAdminPayment must be used within an AdminPaymentLayout")
	}
	return context
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

export default function AdminPaymentLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()

	// The complete page is self-contained — skip the payment setup
	if (pathname.endsWith("/complete")) {
		return <>{children}</>
	}

	return <PaymentSetup>{children}</PaymentSetup>
}

function PaymentSetup({ children }: { children: React.ReactNode }) {
	const { paymentId, registrationId } = useParams<{
		paymentId: string
		registrationId: string
	}>()
	const { isAuthenticated, isLoading: authLoading } = useAuth()

	const pid = Number(paymentId)
	const rid = Number(registrationId)

	const {
		data: adminData,
		isPending: adminPending,
		error: adminError,
	} = useAdminPaymentData(pid, rid)
	const { data: stripeAmount, isPending: amountPending } = useStripeAmount(pid)
	const { data: customerSessionSecret, isPending: sessionPending } =
		useCustomerSession(isAuthenticated)

	if (authLoading) {
		return null
	}

	if (adminPending || amountPending || (isAuthenticated && sessionPending)) {
		return (
			<div className="flex min-h-[200px] items-center justify-center">
				<p className="text-sm text-muted-foreground">Loading payment information...</p>
			</div>
		)
	}

	if (adminError) {
		return (
			<div className="flex min-h-[200px] items-center justify-center">
				<div className="text-center">
					<p className="text-sm font-medium text-destructive">Unable to Process Payment</p>
					<p className="mt-1 text-sm text-muted-foreground">{adminError.message}</p>
				</div>
			</div>
		)
	}

	if (!stripeAmount || !adminData) {
		return null
	}

	return (
		<Elements
			stripe={stripePromise}
			options={{
				mode: "payment",
				currency: "usd",
				amount: stripeAmount.amountCents,
				customerSessionClientSecret: customerSessionSecret ?? undefined,
			}}
		>
			<AdminPaymentContext.Provider value={{ amount: stripeAmount.amountDue, data: adminData }}>
				<div className="max-w-2xl">{children}</div>
			</AdminPaymentContext.Provider>
		</Elements>
	)
}
