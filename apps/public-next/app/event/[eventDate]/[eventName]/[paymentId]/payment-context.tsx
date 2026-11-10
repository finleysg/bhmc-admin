"use client"

import { createContext, useContext } from "react"
import type { PaymentAmount } from "@/lib/hooks/use-stripe-amount"

type PaymentAmountContextType = { amount: PaymentAmount }

export const PaymentAmountContext = createContext<PaymentAmountContextType | null>(null)

export function useCurrentPaymentAmount() {
	const context = useContext(PaymentAmountContext)
	if (!context) {
		throw new Error("useCurrentPaymentAmount must be used within a PaymentLayout")
	}
	return context
}
