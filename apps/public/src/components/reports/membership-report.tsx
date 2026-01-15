/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"

import { httpClient } from "../../utils/api-client"
import { apiUrl } from "../../utils/api-utils"
import { currentSeason } from "../../utils/app-config"
import { ErrorDisplay } from "../feedback/error-display"
import { FullPageSpinner } from "../spinners/full-screen-spinner"
import { RenderReportData } from "./render-report-data"
import { getMembershipReportHeader, getMembershipReportRows } from "./report-utils"

export function MemberhipReport() {
	const [loading, setLoading] = useState(true)
	const [data, setData] = useState<any[]>([])
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		httpClient(apiUrl(`reports/membership/?season=${currentSeason}`))
			.then((json) => {
				setData(json)
				setLoading(false)
			})
			.catch((err: unknown) => {
				setError((err as Error).message) // we know we get an Error object from api calls
				setLoading(false)
			})
	}, [])

	const reportName = `${currentSeason}-membership-report.csv`
	const reportHeader = getMembershipReportHeader()
	const reportData = getMembershipReportRows(data)

	if (loading) {
		return <FullPageSpinner />
	} else if (error) {
		return <ErrorDisplay error={error} delay={5000} onClose={() => setError(null)} />
	} else if (data && data?.length === 0) {
		return <h5 className="text-danger">No report data available.</h5>
	} else {
		return (
			<RenderReportData
				title={`${currentSeason} Membership Report`}
				reportData={reportData}
				reportHeader={reportHeader}
				reportName={reportName}
			/>
		)
	}
}
