"use client"

import { createContext, useContext } from "react"
import type { PaymentAmount } from "@/lib/hooks/use-stripe-amount"
import type { AdminPaymentData } from "@/lib/hooks/use-admin-payment-data"

export interface AdminPaymentContextType {
	amount: PaymentAmount
	data: AdminPaymentData
}

export const AdminPaymentContext = createContext<AdminPaymentContextType | null>(null)

export function useAdminPayment() {
	const context = useContext(AdminPaymentContext)
	if (!context) {
		throw new Error("useAdminPayment must be used within an AdminPaymentLayout")
	}
	return context
}
