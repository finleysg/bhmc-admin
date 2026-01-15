/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react"

import { slugify } from "../../models/club-event"
import { ClubEventProps } from "../../models/common-props"
import { httpClient } from "../../utils/api-client"
import { apiUrl } from "../../utils/api-utils"
import { RenderReportData } from "./render-report-data"
import { getSkinsReportHeader, getSkinsReportRows } from "./report-utils"

export function SkinsReport({ clubEvent }: ClubEventProps) {
	const [data, setData] = useState<any[]>([])

	useEffect(() => {
		httpClient(apiUrl(`reports/skins/?event_id=${clubEvent.id}`)).then((json) => setData(json))
	}, [clubEvent.id])

	const reportName = `${slugify(clubEvent.name)}-skins-report.csv`
	const reportHeader = getSkinsReportHeader()
	const reportData = getSkinsReportRows(clubEvent, data)

	return (
		<RenderReportData
			title="Skins Report"
			reportData={reportData}
			reportHeader={reportHeader}
			reportName={reportName}
		/>
	)
}
