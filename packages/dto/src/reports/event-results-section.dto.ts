import { EventResultsReportRowDto } from "./event-results-report-row.dto"

export type EventResultsSectionDto =
	| {
			type: "stroke"
			header: string
			subSections: Array<{
				header: string
				rows: EventResultsReportRowDto[]
			}>
	  }
	| {
			type: "skins"
			header: string
			subSections: Array<{
				header: string
				rows: EventResultsReportRowDto[]
			}>
	  }
	| {
			type: "proxies"
			header: string
			rows: EventResultsReportRowDto[]
	  }
