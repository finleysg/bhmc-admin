"use client"

import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/registration/payment-utils"
import type { PaymentAmount } from "@/lib/registration/types"

interface AmountDueProps {
	amountDue: PaymentAmount
}

export function AmountDue({ amountDue }: AmountDueProps) {
	return (
		<div className="space-y-2">
			<div className="flex justify-between text-sm">
				<span>Subtotal:</span>
				<span>{formatCurrency(amountDue.subtotal)}</span>
			</div>
			<div className="flex justify-between text-sm">
				<span>Transaction (30&#162; + 2.9%):</span>
				<span>{formatCurrency(amountDue.transactionFee)}</span>
			</div>
			<Separator />
			<div className="flex justify-between text-sm font-bold">
				<span>Total amount due:</span>
				<span>{formatCurrency(amountDue.total)}</span>
			</div>
		</div>
	)
}
