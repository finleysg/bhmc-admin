import { useEffect, useState } from "react"

import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom"

import { Elements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

import { useAuth } from "../../hooks/use-auth"
import { useCustomerSession, usePaymentAmount } from "../../hooks/use-payments"
import * as config from "../../utils/app-config"

import { StripeAmount } from "../../models/payment"

export type AdminPaymentAmountContextType = { amount: StripeAmount }

export function AdminPaymentFlow() {
	const { paymentId } = useParams()
	const { user } = useAuth()
	const location = useLocation()
	const navigate = useNavigate()

	useEffect(() => {
		if (!user.isAuthenticated) {
			navigate(`/session/login?redirectUrl=${encodeURIComponent(location.pathname)}`)
		}
	}, [user.isAuthenticated, navigate, location.pathname])

	const [stripePromise] = useState(() => loadStripe(config.stripePublicKey))
	const { data: stripeAmount, status: amountStatus } = usePaymentAmount(Number(paymentId))
	const { data: customerSession, status: sessionStatus } = useCustomerSession()

	if (!user.isAuthenticated) {
		return null
	}

	if (amountStatus === "pending" || sessionStatus === "pending" || !stripeAmount) {
		return (
			<div className="row">
				<div className="col-12 col-md-6">
					<div className="card mb-4">
						<div className="card-body">
							<p>Loading payment information...</p>
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (amountStatus === "error" || sessionStatus === "error") {
		return (
			<div className="row">
				<div className="col-12 col-md-6">
					<div className="card mb-4">
						<div className="card-body">
							<p className="text-danger">
								Error loading payment information. Please try again later.
							</p>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<Elements
			stripe={stripePromise}
			options={{
				mode: "payment",
				currency: "usd",
				amount: stripeAmount.amountCents,
				customerSessionClientSecret: customerSession,
			}}
		>
			<Outlet context={{ amount: stripeAmount } satisfies AdminPaymentAmountContextType} />
		</Elements>
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminPaymentAmount() {
	return useOutletContext<AdminPaymentAmountContextType>()
}
