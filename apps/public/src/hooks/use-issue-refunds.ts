import { useCallback } from "react"

import { RefundData } from "../models/refund"
import { httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

export function useIssueMultipleRefunds() {
	return useCallback((refunds: Map<number, RefundData>) => {
		const refundList: RefundData[] = []
		refunds.forEach((refund) => {
			if (refund.refund_fees?.length > 0) {
				refundList.push(refund)
			}
		})

		if (refundList.length > 0) {
			return httpClient(apiUrl("refunds/issue_refunds"), {
				body: JSON.stringify({ refunds: refundList }),
			})
		} else {
			return Promise.resolve()
		}
	}, [])
}
