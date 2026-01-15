/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"

import { httpClient } from "../../utils/api-client"
import { apiUrl } from "../../utils/api-utils"
import { ErrorDisplay } from "../feedback/error-display"
import { RenderDetailData } from "./render-detail-data"
import { getPaymentDetailHeader, getPaymentDetailRows } from "./report-utils"

interface PaymentDetailsProps {
	eventId: number
	paymentId: number
}

export function PaymentDetails({ eventId, paymentId }: PaymentDetailsProps) {
	const [loading, setLoading] = useState(true)
	const [data, setData] = useState<any[]>([])
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		httpClient(apiUrl(`reports/payment_details/?payment_id=${paymentId}`))
			.then((json) => {
				setData(json)
				setLoading(false)
			})
			.catch((err: unknown) => {
				setError(err as Error)
				setLoading(false)
			})
	}, [eventId, paymentId])

	const reportHeader = getPaymentDetailHeader()
	const reportData = getPaymentDetailRows(data ?? [])

	if (error) {
		return <ErrorDisplay error={error.message} delay={5000} onClose={() => 0} />
	} else {
		return (
			<RenderDetailData
				title="Payment Details"
				loading={loading}
				reportData={reportData}
				reportHeader={reportHeader}
			/>
		)
	}
}
