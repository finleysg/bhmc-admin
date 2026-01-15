/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"

import { httpClient } from "../../utils/api-client"
import { apiUrl } from "../../utils/api-utils"
import { ErrorDisplay } from "../feedback/error-display"
import { RenderDetailData } from "./render-detail-data"
import { getRefundDetailHeader, getRefundDetailRows } from "./report-utils"

interface RefundDetailsProps {
	eventId: number
	paymentId: number
}

export function RefundDetails({ eventId, paymentId }: RefundDetailsProps) {
	const [loading, setLoading] = useState(true)
	const [data, setData] = useState<any[]>([])
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		httpClient(apiUrl(`reports/refund_details/?payment_id=${paymentId}`))
			.then((json) => {
				setData(json)
				setLoading(false)
			})
			.catch((err: unknown) => {
				setError(err as Error)
				setLoading(false)
			})
	}, [eventId, paymentId])

	const reportHeader = getRefundDetailHeader()
	const reportData = getRefundDetailRows(data ?? [])

	if (error) {
		return <ErrorDisplay error={error.message} delay={5000} onClose={() => 0} />
	} else if (reportData.length === 0) {
		return <p className="text-danger">No refund data available.</p>
	} else {
		return (
			<RenderDetailData
				title="Refund Details"
				loading={loading}
				reportData={reportData}
				reportHeader={reportHeader}
			/>
		)
	}
}
