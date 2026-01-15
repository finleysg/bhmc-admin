import { useState } from "react"

import { Outlet, useOutletContext, useParams } from "react-router-dom"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { useEventRegistration } from "../../hooks/use-event-registration"
import { usePaymentAmount } from "../../hooks/use-payments"
import * as config from "../../utils/app-config"
import { PaymentAmount } from "../../models/payment"

export type PaymentAmountContextType = { amount: PaymentAmount }

export function PaymentFlow() {
	const { paymentId } = useParams()
	const [stripePromise] = useState(() => loadStripe(config.stripePublicKey))
	const { data: stripeAmount, status } = usePaymentAmount(Number(paymentId))
	const { stripeClientSession } = useEventRegistration()

	if (status === "pending" || !stripeAmount) {
		return null
	}

	if (status === "error") {
		// Handle error state - show error message to user
		return <div>Error loading payment information</div>
	}

	return (
		<Elements
			stripe={stripePromise}
			options={{
				mode: "payment",
				currency: "usd",
				amount: stripeAmount?.amountCents,
				customerSessionClientSecret: stripeClientSession,
			}}
		>
			<Outlet context={{ amount: stripeAmount.amountDue } satisfies PaymentAmountContextType} />
		</Elements>
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentPaymentAmount() {
	return useOutletContext<PaymentAmountContextType>()
}
